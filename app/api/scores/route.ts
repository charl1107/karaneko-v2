import { NextRequest, NextResponse } from "next/server";
import { getDB, isMissingDBBinding } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifyToken(token) : null;
  const body = await request.json();
  const { youtube_id, song_title, song_artist, pitch_score, timing_score, stability_score, total_score, rank } = body;
  if (!youtube_id || total_score === undefined)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  try {
    const db = getDB(request);
    const id = crypto.randomUUID();
    await db.prepare(
      "INSERT INTO scores (id, user_id, youtube_id, song_title, song_artist, pitch_score, timing_score, stability_score, total_score, rank) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, user?.userId || null, youtube_id, song_title, song_artist, pitch_score, timing_score, stability_score, total_score, rank).run();

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    if (isMissingDBBinding(error)) {
      return NextResponse.json({ ok: true, skipped: true, reason: "D1 database binding is not available in local Next dev." });
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const youtube_id = searchParams.get("youtube_id");
  try {
    const db = getDB(request);

    const query = youtube_id
      ? "SELECT s.*, u.username FROM scores s LEFT JOIN users u ON s.user_id = u.id WHERE s.youtube_id = ? ORDER BY s.total_score DESC LIMIT 20"
      : "SELECT s.*, u.username FROM scores s LEFT JOIN users u ON s.user_id = u.id ORDER BY s.total_score DESC LIMIT 20";

    const { results } = youtube_id
      ? await db.prepare(query).bind(youtube_id).all()
      : await db.prepare(query).all();

    return NextResponse.json({ scores: results });
  } catch (error) {
    if (isMissingDBBinding(error)) {
      return NextResponse.json({ scores: [] });
    }
    throw error;
  }
}
