"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Plus, Mic2, ListMusic, Wifi } from "lucide-react";
import { csrfFetch } from "@/lib/csrf-client";

interface Song {
  id: string;
  youtubeId: string;
  title: string;
  artist: string;
  thumbnail: string;
}

interface QueueItem {
  id: string;
  youtube_id: string;
  title: string;
  artist: string;
  added_by: string;
  position: number;
}

function RemoteContent() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get("code")?.toUpperCase() || "";
  const [guestName, setGuestName] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "popular" | "queue">("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [popularSongs, setPopularSongs] = useState<Song[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentSong, setCurrentSong] = useState<{ title: string; artist: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [addedSongs, setAddedSongs] = useState<Set<string>>(new Set());
  const [roomValid, setRoomValid] = useState<boolean | null>(null);
  const [, setReactions] = useState<string[]>([]);

  // Validate room
  useEffect(() => {
    if (!roomCode) {
      Promise.resolve().then(() => setRoomValid(false));
      return;
    }
    fetch(`/api/rooms?code=${roomCode}`)
      .then(r => r.json())
      .then(d => {
        setRoomValid(!!d.room);
        if (d.room) {
          setQueue(d.queue || []);
          if (d.room.current_title) setCurrentSong({ title: d.room.current_title, artist: d.room.current_artist });
        }
      })
      .catch(() => setRoomValid(false));
  }, [roomCode]);

  // Load popular songs
  useEffect(() => {
    fetch("/api/category?category=opm")
      .then(r => r.json())
      .then(d => setPopularSongs(d.songs || []));
  }, []);

  // Poll for room/queue updates every 2 seconds
  useEffect(() => {
    if (!roomCode || !nameSet) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/rooms?code=${roomCode}`);
      const d = await res.json();
      if (!d.room) return;
      setQueue(d.queue || []);
      if (d.room.current_title) setCurrentSong({ title: d.room.current_title, artist: d.room.current_artist });
    }, 2000);
    return () => clearInterval(interval);
  }, [roomCode, nameSet]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
    const data = await res.json();
    setSearchResults(data.songs || []);
    setSearching(false);
  };

  const reserveSong = async (song: Song) => {
    if (!roomCode) return;
    await csrfFetch(`/api/rooms/${roomCode}/queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ youtube_id: song.youtubeId, title: song.title, artist: song.artist, thumbnail: song.thumbnail, added_by: guestName }),
    });
    setAddedSongs(prev => new Set([...prev, song.id]));
  };

  const sendReaction = async (emoji: string) => {
    setReactions(prev => [...prev, emoji]);
    setTimeout(() => setReactions(prev => prev.slice(1)), 2000);
    // In a full implementation, broadcast via WebSocket or the room backend.
  };

  const handleSetName = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestName.trim()) setNameSet(true);
  };

  // Invalid room
  if (roomValid === false) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d14", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, color: "white" }}>
        <Mic2 size={40} color="#333" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Room not found</h2>
        <p style={{ color: "#555", fontSize: 14 }}>Ask the host for the correct room code.</p>
      </div>
    );
  }

  // Name entry screen
  if (!nameSet) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d14", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, color: "white" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Mic2 size={28} color="white" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Join Room</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 28 }}>
          <Wifi size={13} color="#69ff47" />
          <span style={{ fontSize: 14, color: "#888" }}>Room: <strong style={{ color: "#a855f7" }}>{roomCode}</strong></span>
        </div>
        <form onSubmit={handleSetName} style={{ width: "100%", maxWidth: 320 }}>
          <input
            value={guestName}
            onChange={e => setGuestName(e.target.value)}
            placeholder="Enter your name..."
            autoFocus
            maxLength={20}
            style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 12, color: "white", fontSize: 16, outline: "none", marginBottom: 12, boxSizing: "border-box" }}
          />
          <button type="submit" disabled={!guestName.trim()} style={{ width: "100%", padding: "14px 0", background: guestName.trim() ? "#7c3aed" : "#333", border: "none", borderRadius: 12, color: "white", fontSize: 16, fontWeight: 700, cursor: guestName.trim() ? "pointer" : "not-allowed" }}>
            Join Party 🎤
          </button>
        </form>
      </div>
    );
  }

  const displaySongs = activeTab === "search" ? searchResults : popularSongs;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d14", color: "white", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0a0a10", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Mic2 size={16} color="#7c3aed" />
            <span style={{ fontSize: 15, fontWeight: 700 }}>KTV Remote</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#a855f7", fontWeight: 600 }}>{guestName}</span>
            <div style={{ padding: "3px 8px", background: "rgba(124,58,237,0.2)", borderRadius: 4, fontSize: 11, color: "#a855f7", fontWeight: 600 }}>
              {roomCode}
            </div>
          </div>
        </div>

        {/* Now playing mini bar */}
        {currentSong && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#69ff47", animation: "pulse 1s ease infinite" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentSong.title}</p>
              <p style={{ fontSize: 11, color: "#777" }}>{currentSong.artist}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0a0a10" }}>
        {([
          { id: "popular", label: "🔥 Popular" },
          { id: "search", label: "🔍 Search" },
          { id: "queue", label: `🎵 Queue (${queue.length})` },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "11px 4px", background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === tab.id ? "#7c3aed" : "transparent"}`, color: activeTab === tab.id ? "white" : "#555", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      {activeTab === "search" && (
        <form onSubmit={handleSearch} style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search songs..." autoFocus style={{ flex: 1, padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white", fontSize: 14, outline: "none" }} />
            <button type="submit" style={{ padding: "10px 14px", background: "#7c3aed", border: "none", borderRadius: 8, color: "white", cursor: "pointer" }}>
              <Search size={15} />
            </button>
          </div>
        </form>
      )}

      {/* Song list */}
      <div style={{ flex: 1 }}>
        {searching && <div style={{ padding: 32, textAlign: "center", color: "#555" }}>Searching...</div>}

        {/* Queue tab */}
        {activeTab === "queue" && queue.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#444" }}>
            <ListMusic size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>Queue is empty</p>
            <p style={{ fontSize: 12, marginTop: 4, color: "#333" }}>Search and reserve songs to add them</p>
          </div>
        )}

        {activeTab === "queue" && queue.map((item, idx) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: 12, color: "#444", minWidth: 20 }}>{idx + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</p>
              <p style={{ fontSize: 12, color: "#555" }}>{item.artist}</p>
              <p style={{ fontSize: 11, color: "#7c3aed", marginTop: 2 }}>Added by {item.added_by}</p>
            </div>
          </div>
        ))}

        {/* Song list (popular/search) */}
        {(activeTab === "popular" || activeTab === "search") && displaySongs.map(song => {
          const added = addedSongs.has(song.id);
          return (
            <div key={song.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.title}</p>
                <p style={{ fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.artist}</p>
              </div>
              <button
                onClick={() => reserveSong(song)}
                disabled={added}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: added ? "rgba(105,255,71,0.12)" : "rgba(124,58,237,0.2)", border: `1px solid ${added ? "rgba(105,255,71,0.3)" : "rgba(124,58,237,0.4)"}`, borderRadius: 6, color: added ? "#69ff47" : "#a855f7", fontSize: 12, fontWeight: 600, cursor: added ? "default" : "pointer", whiteSpace: "nowrap" }}
              >
                {added ? "✓ Added" : <><Plus size={12} /> Reserve</>}
              </button>
            </div>
          );
        })}
      </div>

      {/* Reaction bar */}
      <div style={{ position: "sticky", bottom: 0, background: "#0a0a10", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "#444" }}>React</span>
        <div style={{ display: "flex", gap: 8 }}>
          {["🎉", "🔥", "👏", "💯", "❤️"].map(e => (
            <button key={e} onClick={() => sendReaction(e)} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

export default function RemotePage() {
  return (
    <Suspense fallback={<div style={{ background: "#0d0d14", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>Loading...</div>}>
      <RemoteContent />
    </Suspense>
  );
}
