import { NextRequest, NextResponse } from "next/server";
import { getDB, isMissingDBBinding } from "@/lib/db";
import { validateCsrf } from "@/lib/csrf";

export const runtime = "edge";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const { code } = await params;
  const body = await request.json();
  try {
    const db = getDB(request);

    const room = await db.prepare("SELECT id FROM rooms WHERE code = ?").bind(code.toUpperCase()).first<{ id: string }>();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const fields: string[] = ["last_active = datetime('now')"];
    const values: unknown[] = [];

    if (body.is_playing !== undefined) { fields.push("is_playing = ?"); values.push(body.is_playing ? 1 : 0); }
    if (body.current_youtube_id !== undefined) { fields.push("current_youtube_id = ?"); values.push(body.current_youtube_id); }
    if (body.current_title !== undefined) { fields.push("current_title = ?"); values.push(body.current_title); }
    if (body.current_artist !== undefined) { fields.push("current_artist = ?"); values.push(body.current_artist); }
    if (body.current_thumbnail !== undefined) { fields.push("current_thumbnail = ?"); values.push(body.current_thumbnail); }

    values.push(room.id);
    await db.prepare(`UPDATE rooms SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();

    const updated = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first();
    return NextResponse.json({ room: updated });
  } catch (error) {
    if (isMissingDBBinding(error)) return NextResponse.json({ error: "D1 database is not available in local Next dev." }, { status: 503 });
    throw error;
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const { code } = await params;
  try {
    const db = getDB(request);
    await db.prepare("DELETE FROM rooms WHERE code = ?").bind(code.toUpperCase()).run();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingDBBinding(error)) return NextResponse.json({ ok: true, skipped: true });
    throw error;
  }
}
