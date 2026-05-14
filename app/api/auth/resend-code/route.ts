import { NextRequest, NextResponse } from "next/server";
import { getDB, isMissingDBBinding } from "@/lib/db";
import { sendVerificationEmail, generateVerificationCode } from "@/lib/email";
import { validateCsrf } from "@/lib/csrf";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const { email } = await request.json();
  if (!email)
    return NextResponse.json({ error: "Email required" }, { status: 400 });

  try {
    const db = getDB(request);

  const user = await db.prepare(
    "SELECT id, username FROM users WHERE email = ? LIMIT 1"
  ).bind(email).first<{ id: string; username: string }>();

  if (!user)
    return NextResponse.json({ error: "No account found with that email" }, { status: 404 });

  // Rate limit: check if a code was sent in the last 60 seconds
  const recent = await db.prepare(
    "SELECT created_at FROM verification_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1"
  ).bind(email).first<{ created_at: string }>();

  if (recent) {
    const secondsAgo = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
    if (secondsAgo < 60)
      return NextResponse.json({
        error: `Please wait ${Math.ceil(60 - secondsAgo)} seconds before requesting a new code`,
      }, { status: 429 });
  }

  // Generate new code
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const codeId = crypto.randomUUID();

  await db.prepare("DELETE FROM verification_codes WHERE email = ?").bind(email).run();
  await db.prepare(
    "INSERT INTO verification_codes (id, email, code, expires_at) VALUES (?, ?, ?, ?)"
  ).bind(codeId, email, code, expiresAt).run();

  const { success, error } = await sendVerificationEmail(email, user.username, code);
  if (!success)
    return NextResponse.json({ error: `Failed to send email: ${error}` }, { status: 500 });

    return NextResponse.json({ message: "New code sent!" });
  } catch (error) {
    if (isMissingDBBinding(error)) {
      return NextResponse.json({ error: "D1 database is not available in local Next dev. Run npm run dev:local to use account verification." }, { status: 503 });
    }
    throw error;
  }
}
