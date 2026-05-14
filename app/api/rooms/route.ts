import { NextRequest, NextResponse } from "next/server";
import { getDB, isMissingDBBinding } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";

export const runtime = "edge";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const user = token ? await verifyToken(token) : null;
    const db = getDB(request);

    let code = generateCode();
    for (let i = 0; i < 10; i++) {
      const existing = await db.prepare("SELECT id FROM rooms WHERE code = ?").bind(code).first();
      if (!existing) break;
      code = generateCode();
    }

    const id = crypto.randomUUID();
    await db.prepare(
      "INSERT INTO rooms (id, code, host_id) VALUES (?, ?, ?)"
    ).bind(id, code, user?.userId || null).run();

    return NextResponse.json({ room: { id, code } });
  } catch (error) {
    if (isMissingDBBinding(error)) {
      return NextResponse.json({ error: "D1 database is not available in local Next dev. Run npm run dev:local for Party KTV rooms." }, { status: 503 });
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.toUpperCase();
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  try {
    const db = getDB(request);
    const room = await db.prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const { results: queue } = await db.prepare(
      "SELECT * FROM room_queue WHERE room_id = ? ORDER BY position"
    ).bind((room as { id: string }).id).all();

    const { results: members } = await db.prepare(
      "SELECT * FROM room_members WHERE room_id = ?"
    ).bind((room as { id: string }).id).all();

    return NextResponse.json({ room, queue, members });
  } catch (error) {
    if (isMissingDBBinding(error)) return NextResponse.json({ error: "D1 database is not available in local Next dev." }, { status: 503 });
    throw error;
  }
}
