import { NextRequest, NextResponse } from "next/server";
import { getDB, isMissingDBBinding } from "@/lib/db";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { setCsrfCookie, validateCsrf } from "@/lib/csrf";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const { email, code } = await request.json();

  if (!email || !code)
    return NextResponse.json({ error: "Email and code required" }, { status: 400 });

  try {
    const db = getDB(request);

  // Find the code
  const record = await db.prepare(
    "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND used = 0 LIMIT 1"
  ).bind(email, code.trim()).first<{
    id: string;
    email: string;
    code: string;
    expires_at: string;
    used: number;
  }>();

  if (!record)
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });

  // Check expiry
  if (new Date(record.expires_at) < new Date())
    return NextResponse.json({ error: "Code has expired. Please register again." }, { status: 400 });

  // Mark code as used
  await db.prepare("UPDATE verification_codes SET used = 1 WHERE id = ?").bind(record.id).run();

  // Persist verification on the user row so login can enforce it later.
  await db.prepare(
    "UPDATE users SET email_verified = 1, verified_at = ? WHERE email = ?"
  ).bind(new Date().toISOString(), email).run();

  // Get the user
  const user = await db.prepare(
    "SELECT id, username, role FROM users WHERE email = ? LIMIT 1"
  ).bind(email).first<{ id: string; username: string; role: string }>();

  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Issue JWT token — account is now verified
  const role = user.role as "user" | "admin";
  const token = await signToken({ userId: user.id, username: user.username, role });

  const res = NextResponse.json({
    user: { userId: user.id, username: user.username, role },
  });

  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  setCsrfCookie(res);

    return res;
  } catch (error) {
    if (isMissingDBBinding(error)) {
      return NextResponse.json({ error: "D1 database is not available in local Next dev. Run npm run dev:local to verify accounts." }, { status: 503 });
    }
    throw error;
  }
}
