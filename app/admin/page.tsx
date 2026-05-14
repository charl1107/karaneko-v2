"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { csrfFetch } from "@/lib/csrf-client";
import {
  LayoutDashboard, Music, Users, Plus, Trash2,
  Shield, TrendingUp, Star, Activity
} from "lucide-react";

interface Stats {
  totalUsers: number;
  totalScores: number;
  totalSongs: number;
  avgScore: number;
}

interface ActivityPoint { date: string; count: number }
interface AdminUser { id: string; username: string; role: string; created_at: string }
interface AdminSong {
  id: string; youtube_id: string; title: string;
  artist: string; category: string; featured: boolean; play_count: number;
}

type Tab = "overview" | "songs" | "users";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [songs, setSongs] = useState<AdminSong[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // New song form
  const [newSong, setNewSong] = useState({ youtube_id: "", title: "", artist: "", category: "Pop", featured: false });
  const [addingError, setAddingError] = useState("");
  const [addingSuccess, setAddingSuccess] = useState("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [user, loading, router]);

  const fetchAnalytics = useCallback(async () => {
    setLoadingData(true);
    const res = await fetch("/api/admin/analytics");
    const data = await res.json();
    setStats(data.stats);
    setActivity(data.activityChart || []);
    setRecentUsers(data.recentUsers || []);
    setLoadingData(false);
  }, []);

  const fetchSongs = useCallback(async () => {
    const res = await fetch("/api/admin/songs");
    const data = await res.json();
    setSongs(data.songs || []);
  }, []);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    Promise.resolve().then(() => {
      fetchAnalytics();
      fetchSongs();
    });
  }, [fetchAnalytics, fetchSongs, user]);

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingError(""); setAddingSuccess("");
    const res = await csrfFetch("/api/admin/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSong),
    });
    const data = await res.json();
    if (data.error) { setAddingError(data.error); return; }
    setAddingSuccess("Song added successfully!");
    setNewSong({ youtube_id: "", title: "", artist: "", category: "Pop", featured: false });
    fetchSongs();
  };

  const handleDeleteSong = async (id: string) => {
    if (!confirm("Delete this song?")) return;
    await csrfFetch("/api/admin/songs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSongs((prev) => prev.filter((s) => s.id !== id));
  };

  if (loading || !user || user.role !== "admin") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "var(--text-secondary)" }}>
        {loading ? "Loading..." : "Access denied"}
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? "—", icon: <Users size={20} />, color: "var(--accent-light)" },
    { label: "Total Scores", value: stats?.totalScores ?? "—", icon: <Star size={20} />, color: "#ffd700" },
    { label: "Songs in Catalog", value: stats?.totalSongs ?? "—", icon: <Music size={20} />, color: "#69ff47" },
    { label: "Avg Score", value: stats?.avgScore ?? "—", icon: <TrendingUp size={20} />, color: "#00e5ff" },
  ];

  const inputStyle = {
    padding: "9px 12px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
    width: "100%",
  };

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Shield size={18} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin Dashboard</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Logged in as {user.username}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {([
          { id: "overview", label: "Overview", icon: <LayoutDashboard size={15} /> },
          { id: "songs", label: "Songs", icon: <Music size={15} /> },
          { id: "users", label: "Users", icon: <Users size={15} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${tab === t.id ? "var(--accent)" : "transparent"}`,
              color: tab === t.id ? "var(--accent-light)" : "var(--text-secondary)",
              fontSize: 14, fontWeight: 500, cursor: "pointer",
              transition: "all 0.15s ease",
              marginBottom: -1,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div>
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
            {statCards.map((card) => (
              <div key={card.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{card.label}</span>
                  <div style={{ color: card.color }}>{card.icon}</div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: card.color }}>{loadingData ? "—" : card.value}</div>
              </div>
            ))}
          </div>

          {/* Activity chart (simple bar) */}
          {activity.length > 0 && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Activity size={16} color="var(--accent-light)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Sessions (Last 7 Days)</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
                {activity.map((pt) => {
                  const max = Math.max(...activity.map((a) => a.count), 1);
                  const h = Math.max(8, (pt.count / max) * 80);
                  return (
                    <div key={pt.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{pt.count}</span>
                      <div style={{ width: "100%", height: h, background: "var(--accent)", borderRadius: 4, transition: "height 0.3s ease" }} />
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{pt.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent users */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={15} color="var(--accent-light)" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Recent Users</span>
            </div>
            {recentUsers.map((u, idx) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: idx < recentUsers.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{u.username}</span>
                  {u.role === "admin" && (
                    <span style={{ marginLeft: 8, fontSize: 11, background: "var(--accent)", color: "white", padding: "1px 6px", borderRadius: 4 }}>admin</span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(u.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Songs Tab */}
      {tab === "songs" && (
        <div>
          {/* Add song form */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Plus size={16} color="var(--accent-light)" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Add Song to Catalog</span>
            </div>
            <form onSubmit={handleAddSong}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 12 }}>
                <input value={newSong.youtube_id} onChange={(e) => setNewSong({ ...newSong, youtube_id: e.target.value })} placeholder="YouTube ID (e.g. dQw4w9WgXcQ)" required style={inputStyle} />
                <input value={newSong.title} onChange={(e) => setNewSong({ ...newSong, title: e.target.value })} placeholder="Song title" required style={inputStyle} />
                <input value={newSong.artist} onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })} placeholder="Artist" required style={inputStyle} />
                <select value={newSong.category} onChange={(e) => setNewSong({ ...newSong, category: e.target.value })} style={inputStyle}>
                  {["Pop", "Rock", "K-Pop", "R&B", "OPM", "Classic", "Hip-Hop", "Ballad"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
                  <input type="checkbox" checked={newSong.featured} onChange={(e) => setNewSong({ ...newSong, featured: e.target.checked })} />
                  Featured
                </label>
                <button type="submit" style={{ padding: "8px 20px", background: "var(--accent)", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Add Song
                </button>
                {addingError && <span style={{ fontSize: 12, color: "#f87171" }}>{addingError}</span>}
                {addingSuccess && <span style={{ fontSize: 12, color: "#69ff47" }}>{addingSuccess}</span>}
              </div>
            </form>
          </div>

          {/* Songs list */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Catalog ({songs.length} songs)</span>
            </div>
            {songs.length === 0 ? (
              <p style={{ padding: 24, color: "var(--text-muted)", textAlign: "center", fontSize: 14 }}>No songs in catalog yet</p>
            ) : songs.map((song, idx) => (
              <div key={song.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: idx < songs.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {song.title}
                    {song.featured && <span style={{ marginLeft: 6, fontSize: 10, background: "#ffd70033", color: "#ffd700", padding: "1px 6px", borderRadius: 4 }}>⭐ Featured</span>}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>{song.artist} · {song.category} · {song.play_count} plays</p>
                </div>
                <a href={`https://youtube.com/watch?v=${song.youtube_id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--accent-light)", textDecoration: "none" }}>
                  {song.youtube_id}
                </a>
                <button onClick={() => handleDeleteSong(song.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 4 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === "users" && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>All Users ({recentUsers.length})</span>
          </div>
          {recentUsers.map((u, idx) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: idx < recentUsers.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
                  {u.username[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{u.username}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Joined {new Date(u.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4,
                background: u.role === "admin" ? "var(--accent)" : "var(--bg-secondary)",
                color: u.role === "admin" ? "white" : "var(--text-secondary)",
              }}>
                {u.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
