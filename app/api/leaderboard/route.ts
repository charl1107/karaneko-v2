import { NextRequest, NextResponse } from "next/server";
import { getDB, isMissingDBBinding } from "@/lib/db";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "all";

  try {
    const db = getDB(request);

    let dateFilter = "";
    if (period === "today") dateFilter = "AND s.created_at >= datetime('now', '-1 day')";
    else if (period === "week") dateFilter = "AND s.created_at >= datetime('now', '-7 days')";

    const { results } = await db.prepare(`
      SELECT s.user_id, s.total_score, s.rank, s.song_title, s.song_artist,
             s.youtube_id, s.created_at, u.username
      FROM scores s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1 ${dateFilter}
      ORDER BY s.total_score DESC
      LIMIT 50
    `).all<{
      user_id: string | null;
      total_score: number;
      rank: string;
      song_title: string;
      song_artist: string;
      youtube_id: string;
      created_at: string;
      username: string | null;
    }>();

    const seen = new Set<string>();
    const leaderboard = results
      .filter((row) => {
        const key = row.user_id || row.song_title;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 20)
      .map((row, idx) => ({
        position: idx + 1,
        username: row.username || "Guest",
        totalScore: row.total_score,
        rank: row.rank,
        songTitle: row.song_title,
        songArtist: row.song_artist,
        youtubeId: row.youtube_id,
        createdAt: row.created_at,
      }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    if (isMissingDBBinding(error)) return NextResponse.json({ leaderboard: [] });
    throw error;
  }
}
