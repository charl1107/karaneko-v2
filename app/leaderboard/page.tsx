"use client";
import { useState, useEffect } from "react";
import { Trophy, Clock, Calendar, Infinity } from "lucide-react";

type Period = "all" | "week" | "today";

interface LeaderboardEntry {
  position: number;
  username: string;
  totalScore: number;
  rank: string;
  songTitle: string;
  songArtist: string;
  createdAt: string;
}

const RANK_COLORS: Record<string, string> = {
  S: "#ffd700",
  A: "#00e5ff",
  B: "#69ff47",
  C: "#ff9800",
  D: "#f44336",
};

const POSITION_COLORS = ["#ffd700", "#c0c0c0", "#cd7f32"];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("all");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.resolve().then(() => {
      setLoading(true);
      fetch(`/api/leaderboard?period=${period}`)
        .then((r) => r.json())
        .then((d) => setEntries(d.leaderboard || []))
        .catch(() => setEntries([]))
        .finally(() => setLoading(false));
    });
  }, [period]);

  const periods: { id: Period; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All Time", icon: <Infinity size={14} /> },
    { id: "week", label: "This Week", icon: <Calendar size={14} /> },
    { id: "today", label: "Today", icon: <Clock size={14} /> },
  ];

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Trophy size={24} color="#ffd700" />
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>Leaderboard</h1>
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 28 }}>
        Top singers ranked by their best score
      </p>

      {/* Period tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 20,
              border: "1px solid",
              borderColor: period === p.id ? "var(--accent)" : "var(--border)",
              background: period === p.id ? "var(--accent)" : "transparent",
              color: period === p.id ? "white" : "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {p.icon}
            {p.label}
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      {!loading && entries.length >= 3 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[entries[1], entries[0], entries[2]].map((entry, visualIdx) => {
            const actualPos = visualIdx === 0 ? 2 : visualIdx === 1 ? 1 : 3;
            const color = POSITION_COLORS[actualPos - 1];
            const isFirst = actualPos === 1;
            return (
              <div
                key={entry.position}
                style={{
                  background: "var(--bg-card)",
                  border: `1px solid ${isFirst ? color : "var(--border)"}`,
                  borderRadius: 12,
                  padding: "20px 12px",
                  textAlign: "center",
                  order: visualIdx,
                  transform: isFirst ? "translateY(-8px)" : "none",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>
                  {actualPos === 1 ? "🥇" : actualPos === 2 ? "🥈" : "🥉"}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{entry.username}</p>
                <p style={{ fontSize: 22, fontWeight: 800, color }}>{entry.totalScore}</p>
                <span style={{ fontSize: 12, fontWeight: 700, color: RANK_COLORS[entry.rank] }}>
                  RANK {entry.rank}
                </span>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.songTitle}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ height: 64, background: "var(--bg-card)", borderRadius: 10, opacity: 0.4 }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
          <Trophy size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
          <p>No scores yet for this period</p>
          <p style={{ fontSize: 14, marginTop: 8 }}>Be the first to sing and claim the top spot!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {entries.map((entry) => (
            <div
              key={entry.position}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                background: "var(--bg-card)",
                border: `1px solid ${entry.position <= 3 ? POSITION_COLORS[entry.position - 1] + "44" : "var(--border)"}`,
                borderRadius: 10,
              }}
            >
              <span
                style={{
                  fontSize: entry.position <= 3 ? 18 : 14,
                  fontWeight: 700,
                  minWidth: 28,
                  textAlign: "center",
                  color: entry.position <= 3 ? POSITION_COLORS[entry.position - 1] : "var(--text-muted)",
                }}
              >
                {entry.position <= 3
                  ? entry.position === 1 ? "🥇" : entry.position === 2 ? "🥈" : "🥉"
                  : `#${entry.position}`}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{entry.username}</p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.songTitle} · {entry.songArtist}
                </p>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{entry.totalScore}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: RANK_COLORS[entry.rank] }}>
                  {entry.rank}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
