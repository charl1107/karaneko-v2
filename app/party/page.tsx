"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic2, Users, Tv2, Smartphone, ArrowRight, Loader2 } from "lucide-react";
import { csrfFetch } from "@/lib/csrf-client";

export default function PartyPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const createRoom = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await csrfFetch("/api/rooms", { method: "POST" });
      const data = await res.json();
      if (data.room?.code) {
        router.push(`/ktv?code=${data.room.code}`);
      } else {
        setError("Failed to create room. Try again.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) { setError("Enter a valid room code"); return; }
    router.push(`/remote?code=${code}`);
  };

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Mic2 size={32} color="white" />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 8 }}>
          Party KTV
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
          Start a karaoke room for your group — everyone controls the queue from their phone
        </p>
      </div>

      {/* How it works */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 40 }}>
        {[
          { icon: <Tv2 size={20} color="var(--accent-light)" />, title: "Big Screen", desc: "Open on your TV or laptop — the main player runs here" },
          { icon: <Smartphone size={20} color="#69ff47" />, title: "Phone Remote", desc: "Guests scan QR code — search and queue songs from their phone" },
          { icon: <Users size={20} color="#ffd700" />, title: "10+ People", desc: "Everyone joins the same room and adds songs to the shared queue" },
          { icon: <Mic2 size={20} color="#00e5ff" />, title: "Auto Play", desc: "Songs play one by one automatically — no one needs to touch the screen" },
        ].map((item) => (
          <div key={item.title} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <div style={{ marginBottom: 8 }}>{item.icon}</div>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{item.title}</p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Create room */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-accent)", borderRadius: 16, padding: 28, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>🎤 Start a Room</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
          Open on the big screen. Share the QR code so guests can join from their phones.
        </p>
        <button
          onClick={createRoom}
          disabled={creating}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 0", background: creating ? "var(--text-muted)" : "var(--accent)", border: "none", borderRadius: 10, color: "white", fontSize: 16, fontWeight: 700, cursor: creating ? "not-allowed" : "pointer", transition: "background 0.15s ease" }}
        >
          {creating ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Creating...</> : <>Create Room <ArrowRight size={18} /></>}
        </button>
      </div>

      {/* Join room */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>📱 Join a Room</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
          Got a room code from the host? Enter it here to control the queue from your phone.
        </p>
        <form onSubmit={joinRoom} style={{ display: "flex", gap: 8 }}>
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Room code (e.g. GK83)"
            maxLength={6}
            style={{ flex: 1, padding: "12px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 18, fontWeight: 700, letterSpacing: 4, outline: "none", textTransform: "uppercase" }}
          />
          <button type="submit" style={{ padding: "12px 20px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <ArrowRight size={18} />
          </button>
        </form>
        {error && <p style={{ fontSize: 13, color: "#f87171", marginTop: 10 }}>{error}</p>}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
