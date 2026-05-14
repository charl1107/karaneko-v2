import { NextRequest, NextResponse } from "next/server";
import { getDB, isMissingDBBinding } from "@/lib/db";
import { hashPassword, COOKIE_NAME } from "@/lib/auth";
import { sendVerificationEmail, generateVerificationCode } from "@/lib/email";
import { validateCsrf } from "@/lib/csrf";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const { username, email, password } = await request.json();

  if (!username || !email || !password)
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });

  try {
    const db = getDB(request);

  // Check existing
  const existing = await db.prepare(
    "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1"
  ).bind(username, email).first();
  if (existing)
    return NextResponse.json({ error: "Username or email already taken" }, { status: 409 });

  // Create user with unverified status
  const id = crypto.randomUUID();
  const password_hash = await hashPassword(password);

  await db.prepare(
    "INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, 'user')"
  ).bind(id, username, email, password_hash).run();

  // Generate verification code
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
  const codeId = crypto.randomUUID();

  // Delete any old codes for this email
  await db.prepare("DELETE FROM verification_codes WHERE email = ?").bind(email).run();

  // Store new code
  await db.prepare(
    "INSERT INTO verification_codes (id, email, code, expires_at) VALUES (?, ?, ?, ?)"
  ).bind(codeId, email, code, expiresAt).run();

  // Send email
  const { success, error: emailError } = await sendVerificationEmail(email, username, code);
  if (!success) {
    // Roll back user creation if email fails
    await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
    return NextResponse.json({ error: `Failed to send verification email: ${emailError}` }, { status: 500 });
  }

  // Return pending state — user must verify before getting a token
  const res = NextResponse.json({
    pending: true,
    message: `Verification code sent to ${email}`,
    email, // send back so frontend knows where to verify
  });

  // Clear any existing auth cookie
  res.cookies.delete(COOKIE_NAME);
    return res;
  } catch (error) {
    if (isMissingDBBinding(error)) {
      return NextResponse.json({ error: "D1 database is not available in local Next dev. Run npm run dev:local to register accounts." }, { status: 503 });
    }
    throw error;
  }
}
