import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";
import { NextRequest } from "next/server";
import { CSRF_COOKIE_NAME, validateCsrf } from "@/lib/csrf";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  res.cookies.delete(CSRF_COOKIE_NAME);
  return res;
}
