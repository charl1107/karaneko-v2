"use client";
import { useState, useEffect, useCallback } from "react";
import { X, Trophy, Music, Globe, RefreshCw, Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface ScoreEntry {
  position: number;
  username: string;
  totalScore: number;
  rank: string;
  songTitle: string;
  songArtist: string;
  createdAt: string;
}

interface RankingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong?: { youtubeId: string; title: string; artist: string } | null;
}

const RANK_COLORS: Record<string, string> = {
  S: "#ffd700",
  A: "#00e5ff",
  B: "#69ff47",
  C: "#ff9800",
  D: "#f44336",
};

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function ScoreRow({ entry, highlight }: { entry: ScoreEntry; highlight?: boolean }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 14px",
      background: highlight ? "rgba(124,58,237,0.12)" : "transparent",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      borderLeft: highlight ? "2px solid var(--accent)" : "2px solid transparent",
      transition: "background 0.2s ease",
    }}>
      {/* Position */}
      <span style={{
        fontSize: entry.position <= 3 ? 18 : 13,
        fontWeight: 700,
        minWidth: 28,
        textAlign: "center",
        color: entry.position <= 3 ? ["#ffd700","#c0c0c0","#cd7f32"][entry.position-1] : "var(--text-muted)",
      }}>
        {MEDAL[entry.position] || `#${entry.position}`}
      </span>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13,
          fontWeight: highlight ? 700 : 500,
          color: highlight ? "white" : "var(--text-primary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {entry.username}
          {highlight && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--accent-light)", fontWeight: 600 }}>YOU</span>}
        </p>
        {entry.songTitle && (
          <p style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entry.songTitle}
          </p>
        )}
      </div>

      {/* Score + Rank */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>
          {entry.totalScore}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: RANK_COLORS[entry.rank] }}>
          {entry.rank}
        </div>
      </div>
    </div>
  );
}

export default function RankingPanel({ isOpen, onClose, currentSong }: RankingPanelProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"song" | "global">("song");
  const [songScores, setSongScores] = useState<ScoreEntry[]>([]);
  const [globalScores, setGlobalScores] = useState<ScoreEntry[]>([]);
  const [period, setPeriod] = useState<"all" | "week" | "today">("all");
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(0);

  const fetchSongScores = useCallback(async () => {
    if (!currentSong?.youtubeId) return;
    const res = await fetch(`/api/scores?youtube_id=${currentSong.youtubeId}`);
    const data = await res.json();
    const scores: ScoreEntry[] = (data.scores || []).map((s: {
      username?: string; total_score: number; rank: string;
      song_title: string; song_artist: string; created_at: string;
    }, idx: number) => ({
      position: idx + 1,
      username: s.username || "Guest",
      totalScore: s.total_score,
      rank: s.rank,
      songTitle: s.song_title,
      songArtist: s.song_artist,
      createdAt: s.created_at,
    }));
    setSongScores(scores);
  }, [currentSong]);

  const fetchGlobalScores = useCallback(async () => {
    const res = await fetch(`/api/ranking?period=${period}`);
    const data = await res.json();
    setGlobalScores(data.leaderboard || []);
  }, [period]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchSongScores(), fetchGlobalScores()]);
    setLoading(false);
    setLastRefresh(Date.now());
  }, [fetchSongScores, fetchGlobalScores]);

  // Fetch when panel opens or song changes
  useEffect(() => {
    if (!isOpen) return;
    Promise.resolve().then(() => refresh());
  }, [currentSong?.youtubeId, isOpen, period, refresh]);

  // Switch to song tab when song changes
  useEffect(() => {
    if (!currentSong) return;
    Promise.resolve().then(() => setTab("song"));
  }, [currentSong]);

  const activeScores = tab === "song" ? songScores : globalScores;
  const userPosition = activeScores.find(e => e.username === user?.username);

  return (
    <>
      {/* Backdrop (mobile) */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 39,
            display: "none",
          }}
          className="ranking-backdrop"
        />
      )}

      {/* Slide-in panel */}
      <div style={{
        position: "fixed",
        top: 0,
        right: isOpen ? 0 : "-380px",
        width: 370,
        height: "100vh",
        background: "var(--bg-secondary)",
        borderLeft: "1px solid var(--border)",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        transition: "right 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: isOpen ? "-8px 0 32px rgba(0,0,0,0.4)" : "none",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 16px 0",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Trophy size={18} color="#ffd700" />
            <span style={{ fontSize: 16, fontWeight: 700 }}>Ranking Board</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={refresh}
              disabled={loading}
              title="Refresh"
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4, display: "flex" }}
            >
              <RefreshCw size={15} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            </button>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4, display: "flex" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Now playing bar */}
        {currentSong && (
          <div style={{
            margin: "12px 16px 0",
            padding: "8px 12px",
            background: "rgba(124,58,237,0.1)",
            border: "1px solid rgba(124,58,237,0.2)",
            borderRadius: 8,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#69ff47", flexShrink: 0, animation: "pulse 1.5s ease infinite" }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentSong.title}
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{currentSong.artist}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 0,
          margin: "12px 16px 0",
          background: "var(--bg-card)",
          borderRadius: 8,
          padding: 3,
          flexShrink: 0,
        }}>
          <button
            onClick={() => setTab("song")}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "7px 0",
              background: tab === "song" ? "var(--accent)" : "transparent",
              border: "none", borderRadius: 6,
              color: tab === "song" ? "white" : "var(--text-secondary)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Music size={12} />
            This Song
            {songScores.length > 0 && (
              <span style={{
                fontSize: 10, background: tab === "song" ? "rgba(255,255,255,0.2)" : "var(--bg-secondary)",
                padding: "1px 5px", borderRadius: 8,
              }}>
                {songScores.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("global")}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "7px 0",
              background: tab === "global" ? "var(--accent)" : "transparent",
              border: "none", borderRadius: 6,
              color: tab === "global" ? "white" : "var(--text-secondary)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Globe size={12} />
            Global
          </button>
        </div>

        {/* Period filter (global tab only) */}
        {tab === "global" && (
          <div style={{ display: "flex", gap: 6, padding: "10px 16px 0", flexShrink: 0 }}>
            {(["all", "week", "today"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  flex: 1, padding: "5px 0",
                  background: period === p ? "rgba(124,58,237,0.2)" : "transparent",
                  border: `1px solid ${period === p ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 6,
                  color: period === p ? "var(--accent-light)" : "var(--text-muted)",
                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.15s ease",
                  textTransform: "capitalize",
                }}
              >
                {p === "all" ? "All Time" : p === "week" ? "This Week" : "Today"}
              </button>
            ))}
          </div>
        )}

        {/* Your position badge */}
        {userPosition && (
          <div style={{
            margin: "10px 16px 0",
            padding: "8px 12px",
            background: "rgba(255,215,0,0.08)",
            border: "1px solid rgba(255,215,0,0.2)",
            borderRadius: 8,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Crown size={14} color="#ffd700" />
            <span style={{ fontSize: 12, color: "#ffd700", fontWeight: 600 }}>
              Your best: #{userPosition.position} — {userPosition.totalScore} pts ({userPosition.rank})
            </span>
          </div>
        )}

        {/* Scores list */}
        <div style={{ flex: 1, overflowY: "auto", marginTop: 10 }}>
          {loading && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Loading rankings...
            </div>
          )}

          {!loading && activeScores.length === 0 && (
            <div style={{ padding: "40px 24px", textAlign: "center" }}>
              <Trophy size={40} style={{ marginBottom: 12, opacity: 0.15 }} />
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 6 }}>
                {tab === "song" ? "No scores for this song yet" : "No scores yet"}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                {tab === "song" ? "Sing this song and be the first!" : "Start singing to appear here"}
              </p>
            </div>
          )}

          {!loading && activeScores.map(entry => (
            <ScoreRow
              key={`${entry.position}-${entry.username}`}
              entry={entry}
              highlight={entry.username === user?.username}
            />
          ))}
        </div>

        {/* Footer */}
        {lastRefresh > 0 && (
          <div style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
          }}>
            <p style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>
              Updated {new Date(lastRefresh).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @media (max-width: 600px) {
          .ranking-backdrop { display: block !important; }
        }
      `}</style>
    </>
  );
}
