import { NextRequest, NextResponse } from "next/server";
import { getDB, isMissingDBBinding } from "@/lib/db";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getDB(request);

    const [usersRow, scoresRow, songsRow, avgRow] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM scores").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) as count FROM songs").first<{ count: number }>(),
      db.prepare("SELECT AVG(total_score) as avg FROM scores").first<{ avg: number }>(),
    ]);

    const { results: activityRaw } = await db.prepare(`
      SELECT substr(created_at, 1, 10) as date, COUNT(*) as count
      FROM scores
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY substr(created_at, 1, 10)
      ORDER BY date
    `).all<{ date: string; count: number }>();

    const { results: recentUsers } = await db.prepare(
      "SELECT id, username, role, created_at FROM users ORDER BY created_at DESC LIMIT 10"
    ).all();

    return NextResponse.json({
      stats: {
        totalUsers: usersRow?.count || 0,
        totalScores: scoresRow?.count || 0,
        totalSongs: songsRow?.count || 0,
        avgScore: Math.round(avgRow?.avg || 0),
      },
      activityChart: activityRaw,
      recentUsers,
    });
  } catch (error) {
    if (isMissingDBBinding(error)) {
      return NextResponse.json({
        stats: { totalUsers: 0, totalScores: 0, totalSongs: 0, avgScore: 0 },
        activityChart: [],
        recentUsers: [],
      });
    }
    throw error;
  }
}
