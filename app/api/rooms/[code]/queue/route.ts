import { NextRequest, NextResponse } from "next/server";
import { getDB, isMissingDBBinding } from "@/lib/db";
import { validateCsrf } from "@/lib/csrf";

export const runtime = "edge";

async function getRoom(db: ReturnType<typeof import("@/lib/db").getDB>, code: string) {
  return db.prepare("SELECT id FROM rooms WHERE code = ?").bind(code.toUpperCase()).first<{ id: string }>();
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const db = getDB(request);
    const room = await getRoom(db, code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    const { results } = await db.prepare("SELECT * FROM room_queue WHERE room_id = ? ORDER BY position").bind(room.id).all();
    return NextResponse.json({ queue: results });
  } catch (error) {
    if (isMissingDBBinding(error)) return NextResponse.json({ queue: [] });
    throw error;
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const { code } = await params;
  const { youtube_id, title, artist, thumbnail, added_by } = await request.json();
  if (!youtube_id || !title) return NextResponse.json({ error: "youtube_id and title required" }, { status: 400 });

  try {
    const db = getDB(request);
    const room = await getRoom(db, code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const last = await db.prepare("SELECT position FROM room_queue WHERE room_id = ? ORDER BY position DESC LIMIT 1").bind(room.id).first<{ position: number }>();
    const position = last ? last.position + 1 : 0;
    const id = crypto.randomUUID();

    await db.prepare(
      "INSERT INTO room_queue (id, room_id, youtube_id, title, artist, thumbnail, added_by, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, room.id, youtube_id, title, artist, thumbnail || "", added_by || "Guest", position).run();

    return NextResponse.json({ item: { id, room_id: room.id, youtube_id, title, artist, thumbnail, added_by, position } });
  } catch (error) {
    if (isMissingDBBinding(error)) {
      return NextResponse.json({ error: "D1 database is not available in local Next dev. Run npm run dev:local for Party KTV rooms." }, { status: 503 });
    }
    throw error;
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const { code } = await params;
  const { id } = await request.json();
  try {
    const db = getDB(request);
    const room = await getRoom(db, code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (id === "all") {
      await db.prepare("DELETE FROM room_queue WHERE room_id = ?").bind(room.id).run();
    } else {
      await db.prepare("DELETE FROM room_queue WHERE id = ? AND room_id = ?").bind(id, room.id).run();
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingDBBinding(error)) return NextResponse.json({ ok: true, skipped: true });
    throw error;
  }
}
