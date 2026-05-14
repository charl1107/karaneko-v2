import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { ensureCsrfCookie } from "@/lib/csrf";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const res = NextResponse.json({ user: null });
    ensureCsrfCookie(request, res);
    return res;
  }
  const payload = await verifyToken(token);
  const res = NextResponse.json({ user: payload || null });
  ensureCsrfCookie(request, res);
  return res;
}
