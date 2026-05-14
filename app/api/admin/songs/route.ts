import { NextRequest, NextResponse } from "next/server";
import { getDB, isMissingDBBinding } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";

export const runtime = "edge";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const user = await verifyToken(token);
  return user?.role === "admin" ? user : null;
}

export async function GET(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getDB(request);
    const { results } = await db.prepare("SELECT * FROM songs ORDER BY created_at DESC").all();
    return NextResponse.json({ songs: results });
  } catch (error) {
    if (isMissingDBBinding(error)) return NextResponse.json({ songs: [] });
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  if (!await requireAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { youtube_id, title, artist, thumbnail, category, featured } = await request.json();
  if (!youtube_id || !title || !artist) return NextResponse.json({ error: "youtube_id, title, artist required" }, { status: 400 });
  try {
    const db = getDB(request);
    const id = crypto.randomUUID();
    await db.prepare(
      "INSERT OR REPLACE INTO songs (id, youtube_id, title, artist, thumbnail, category, featured) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, youtube_id, title, artist, thumbnail || "", category || "", featured ? 1 : 0).run();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingDBBinding(error)) return NextResponse.json({ error: "D1 database is not available in local Next dev." }, { status: 503 });
    throw error;
  }
}

export async function DELETE(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  if (!await requireAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await request.json();
  try {
    const db = getDB(request);
    await db.prepare("DELETE FROM songs WHERE id = ?").bind(id).run();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingDBBinding(error)) return NextResponse.json({ ok: true, skipped: true });
    throw error;
  }
}
