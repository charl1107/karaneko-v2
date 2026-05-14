import { NextRequest, NextResponse } from "next/server";
import { getDB, isMissingDBBinding } from "@/lib/db";
import { comparePassword, signToken, COOKIE_NAME } from "@/lib/auth";
import { setCsrfCookie, validateCsrf } from "@/lib/csrf";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const { username, password } = await request.json();
  if (!username || !password)
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });

  try {
    const db = getDB(request);
    const user = await db.prepare(
      "SELECT id, username, password_hash, role, email_verified FROM users WHERE username = ? LIMIT 1"
    ).bind(username).first<{ id: string; username: string; password_hash: string; role: string; email_verified: number }>();

    if (!user)
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });

    if (!user.email_verified)
      return NextResponse.json({ error: "Please verify your email before logging in." }, { status: 403 });

    const valid = await comparePassword(password, user.password_hash);
    if (!valid)
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });

    const role = user.role as "user" | "admin";
    const token = await signToken({ userId: user.id, username: user.username, role });
    const res = NextResponse.json({ user: { userId: user.id, username: user.username, role } });
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
      return NextResponse.json({ error: "D1 database is not available in local Next dev. Run npm run dev:local to use accounts." }, { status: 503 });
    }
    throw error;
  }
}
