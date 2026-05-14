"use client";
import KaraokeSettings from "@/components/KaraokeSettings";
import RankingPanel from "@/components/RankingPanel";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Play, Square, Maximize2, Minimize2, Settings, Share2,
  Search, Mic2, ListMusic, Wifi, Users,
  SkipForward, Trophy
} from "lucide-react";
import QRCode from "react-qr-code";
import { csrfFetch } from "@/lib/csrf-client";

interface QueueItem {
  id: string;
  youtube_id: string;
  title: string;
  artist: string;
  thumbnail?: string;
  added_by: string;
  position: number;
}

interface Song {
  id: string;
  youtubeId: string;
  title: string;
  artist: string;
  thumbnail: string;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: { Player: any; PlayerState: { ENDED: number; PLAYING: number; PAUSED: number } };
    onYouTubeIframeAPIReady: () => void;
  }
}

function KTVScreen() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get("code")?.toUpperCase() || "";

  const [activeTab, setActiveTab] = useState<"popular" | "search" | "reserved">("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [popularSongs, setPopularSongs] = useState<Song[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentSong, setCurrentSong] = useState<{ youtube_id: string; title: string; artist: string } | null>(null);
  const [, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [memberCount, setMemberCount] = useState(1);
  const [searching, setSearching] = useState(false);
  const [reactions, setReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);

  const playerRef = useRef<{ loadVideoById: (id: string) => void; playVideo: () => void; pauseVideo: () => void; destroy: () => void } | null>(null);
  const playerElRef = useRef<HTMLDivElement>(null);
  const [ytReady, setYtReady] = useState(false);
  const reactionId = useRef(0);
  const handleNextRef = useRef<() => void>(() => {});

  const playSongFromQueue = useCallback(async (item: QueueItem) => {
    setCurrentSong({ youtube_id: item.youtube_id, title: item.title, artist: item.artist });
    setIsPlaying(true);
    if (roomCode) {
      await csrfFetch(`/api/rooms/${roomCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_youtube_id: item.youtube_id, current_title: item.title, current_artist: item.artist, is_playing: true }),
      });
      await csrfFetch(`/api/rooms/${roomCode}/queue`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      setQueue(prev => prev.filter(q => q.id !== item.id));
    }
  }, [roomCode]);

  const handleNext = useCallback(() => {
    if (queue.length > 0) playSongFromQueue(queue[0]);
    else { setIsPlaying(false); setCurrentSong(null); }
  }, [queue, playSongFromQueue]);

  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  useEffect(() => {
    if (!currentSong && queue.length > 0) {
      Promise.resolve().then(() => {
        void playSongFromQueue(queue[0]);
      });
    }
  }, [currentSong, playSongFromQueue, queue]);

  // Load YouTube API
  useEffect(() => {
    if (window.YT) {
      Promise.resolve().then(() => setYtReady(true));
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => setYtReady(true);
  }, []);

  // Load room data
  useEffect(() => {
    if (!roomCode) return;
    fetch(`/api/rooms?code=${roomCode}`)
      .then(r => r.json())
      .then(d => {
        if (d.room) {
          setQueue(d.queue || []);
          setMemberCount((d.members || []).length || 1);
          if (d.room.current_youtube_id) {
            setCurrentSong({ youtube_id: d.room.current_youtube_id, title: d.room.current_title, artist: d.room.current_artist });
            setIsPlaying(d.room.is_playing);
          }
        }
      });
  }, [roomCode]);

  // Load popular OPM/Filipino songs
  useEffect(() => {
    fetch("/api/category?category=opm")
      .then(r => r.json())
      .then(d => setPopularSongs(d.songs || []));
  }, []);

  // Poll for room/queue changes every 2 seconds
  useEffect(() => {
    if (!roomCode) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/rooms?code=${roomCode}`);
      const d = await res.json();
      if (!d.room) return;
      setQueue(d.queue || []);
      setMemberCount((d.members || []).length || 1);
      if (d.room.current_youtube_id && d.room.current_youtube_id !== currentSong?.youtube_id) {
        setCurrentSong({ youtube_id: d.room.current_youtube_id, title: d.room.current_title, artist: d.room.current_artist });
      }
      setIsPlaying(!!d.room.is_playing);
    }, 2000);
    return () => clearInterval(interval);
  }, [roomCode, currentSong?.youtube_id]);

  // Init YouTube player
  useEffect(() => {
    if (!ytReady || !playerElRef.current) return;
    if (playerRef.current) return;
    playerRef.current = new window.YT.Player(playerElRef.current, {
      videoId: currentSong?.youtube_id || "",
      playerVars: { autoplay: 0, rel: 0, modestbranding: 1, controls: 1 },
      events: {
        onStateChange: (e: { data: number }) => {
          if (e.data === window.YT.PlayerState.ENDED) handleNextRef.current();
          if (e.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
          if (e.data === window.YT.PlayerState.PAUSED) setIsPlaying(false);
        },
      },
    });
  }, [currentSong?.youtube_id, ytReady]);

  // Load video when current song changes
  useEffect(() => {
    if (!playerRef.current || !currentSong?.youtube_id) return;
    playerRef.current.loadVideoById(currentSong.youtube_id);
  }, [currentSong?.youtube_id]);

  const handlePlay = () => {
    playerRef.current?.playVideo();
    setIsPlaying(true);
    if (roomCode) csrfFetch(`/api/rooms/${roomCode}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_playing: true }) });
  };

  const handleStop = () => {
    playerRef.current?.pauseVideo();
    setIsPlaying(false);
    if (roomCode) csrfFetch(`/api/rooms/${roomCode}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_playing: false }) });
  };

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
      body: JSON.stringify({ youtube_id: song.youtubeId, title: song.title, artist: song.artist, thumbnail: song.thumbnail, added_by: "Host" }),
    });
  };

  const playNow = (song: Song) => {
    setCurrentSong({ youtube_id: song.youtubeId, title: song.title, artist: song.artist });
    setIsPlaying(true);
    if (roomCode) csrfFetch(`/api/rooms/${roomCode}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current_youtube_id: song.youtubeId, current_title: song.title, current_artist: song.artist, is_playing: true }) });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const addReaction = (emoji: string) => {
    const id = reactionId.current++;
    const x = 10 + ((id * 37) % 80);
    setReactions(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 2500);
  };

  const remoteUrl = typeof window !== "undefined" ? `${window.location.origin}/remote?code=${roomCode}` : "";

  const displaySongs = activeTab === "search" ? searchResults : activeTab === "popular" ? popularSongs : queue.map(q => ({ id: q.id, youtubeId: q.youtube_id, title: q.title, artist: q.artist, thumbnail: q.thumbnail || "" }));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0d0d14", color: "white", overflow: "hidden", position: "relative" }}>

      {/* Floating reactions */}
      {reactions.map(r => (
        <div key={r.id} style={{ position: "fixed", bottom: 80, left: `${r.x}%`, fontSize: 32, zIndex: 999, animation: "floatUp 2.5s ease forwards", pointerEvents: "none" }}>
          {r.emoji}
        </div>
      ))}

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 52, borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0a0a10", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Mic2 size={18} color="#7c3aed" />
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px" }}>
            KARAOKE <span style={{ color: "#a855f7" }}>✏️</span> <span style={{ fontWeight: 400, color: "#888" }}>Night</span>
          </span>
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Room ID */}
          {roomCode && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "rgba(255,255,255,0.06)", borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
              <Wifi size={13} color="#69ff47" />
              ID: {roomCode}
            </div>
          )}

          {/* Members */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "rgba(255,255,255,0.06)", borderRadius: 6, fontSize: 13 }}>
            <Users size={13} color="#a855f7" />
            {memberCount}
          </div>

          {/* Remote / QR */}
          <button onClick={() => setShowQR(!showQR)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: showQR ? "#7c3aed" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "white", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
            <Share2 size={13} /> Remote
          </button>

          {/* Ranking */}
          <button onClick={() => setShowRanking(!showRanking)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: showRanking ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${showRanking ? "rgba(255,215,0,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 6, color: showRanking ? "#ffd700" : "#888", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            <Trophy size={13} /> Ranking
          </button>

          {/* Settings */}
          <button onClick={() => setShowSettings(!showSettings)} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#888", cursor: "pointer" }}>
            <Settings size={14} />
          </button>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#888", cursor: "pointer" }}>
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left: Player area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "14px 14px 14px 16px", minWidth: 0 }}>

          {/* YouTube embed */}
          <div style={{ position: "relative", background: "#000", borderRadius: 10, overflow: "hidden", flex: 1, minHeight: 0 }}>
            <div ref={playerElRef} style={{ width: "100%", height: "100%" }} />
            {!currentSong && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a0a14" }}>
                <Mic2 size={48} color="#333" style={{ marginBottom: 12 }} />
                <p style={{ color: "#444", fontSize: 15 }}>Reserve a song to start singing</p>
              </div>
            )}
          </div>

          {/* Song info */}
          {currentSong && (
            <div style={{ marginTop: 10, marginBottom: 8 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#7c3aed" }}>{currentSong.title}</p>
              <p style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{currentSong.artist}</p>
            </div>
          )}
          {!currentSong && <div style={{ marginTop: 10, marginBottom: 8, height: 36 }} />}

          {/* Bottom controls - exactly like screenshot */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={handlePlay} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#22c55e", border: "none", borderRadius: 6, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Play size={14} fill="white" /> Play
            </button>
            <button onClick={handleStop} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#ef4444", border: "none", borderRadius: 6, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Square size={14} fill="white" /> Stop Song
            </button>
            <button onClick={handleNext} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#3b82f6", border: "none", borderRadius: 6, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <SkipForward size={14} /> Next
            </button>

            {/* Reaction buttons */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {["🎉", "🔥", "👏", "💯", "❤️"].map(e => (
                <button key={e} onClick={() => addReaction(e)} style={{ fontSize: 18, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div style={{ width: 340, borderLeft: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", background: "#0a0a10", flexShrink: 0 }}>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {([
              { id: "popular", label: "🔥 Popular" },
              { id: "search", label: "🔍 Search" },
              { id: "reserved", label: `🎵 Reserved ${queue.length > 0 ? queue.length : 0}` },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ flex: 1, padding: "12px 4px", background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === tab.id ? "#7c3aed" : "transparent"}`, color: activeTab === tab.id ? "white" : "#666", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease" }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search input */}
          {activeTab === "search" && (
            <form onSubmit={handleSearch} style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search songs..."
                  autoFocus
                  style={{ flex: 1, padding: "8px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "white", fontSize: 13, outline: "none" }}
                />
                <button type="submit" style={{ padding: "8px 12px", background: "#7c3aed", border: "none", borderRadius: 6, color: "white", cursor: "pointer" }}>
                  <Search size={14} />
                </button>
              </div>
            </form>
          )}

          {/* Song list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {searching && (
              <div style={{ padding: 24, textAlign: "center", color: "#555" }}>Searching...</div>
            )}

            {activeTab === "reserved" && queue.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", color: "#444" }}>
                <ListMusic size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                <p style={{ fontSize: 13 }}>No songs reserved yet</p>
              </div>
            )}

            {activeTab === "reserved" && queue.map((item, idx) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}
                onClick={() => playSongFromQueue(item)}>
                <span style={{ fontSize: 11, color: "#444", minWidth: 18 }}>{idx + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</p>
                  <p style={{ fontSize: 11, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.artist}</p>
                  <p style={{ fontSize: 10, color: "#7c3aed", marginTop: 1 }}>by {item.added_by}</p>
                </div>
                <Play size={14} color="#7c3aed" />
              </div>
            ))}

            {(activeTab === "popular" || activeTab === "search") && (displaySongs as Song[]).map((song) => (
              <div key={song.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.title}</p>
                  <p style={{ fontSize: 11, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.artist}</p>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {activeTab !== "search" && (
                    <button onClick={() => playNow(song)} style={{ padding: "4px 8px", background: "#22c55e22", border: "1px solid #22c55e44", borderRadius: 4, color: "#22c55e", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                      ▶ Now
                    </button>
                  )}
                  <button onClick={() => reserveSong(song)} style={{ padding: "4px 10px", background: "#7c3aed22", border: "1px solid #7c3aed55", borderRadius: 4, color: "#a855f7", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                    + Reserve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QR Code modal */}
      {showQR && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setShowQR(false)}>
          <div style={{ background: "#1a1a26", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 16, padding: 32, textAlign: "center", maxWidth: 320 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Join this Room</h3>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Scan QR or visit the link on your phone</p>
            <div style={{ background: "white", padding: 16, borderRadius: 12, display: "inline-block", marginBottom: 16 }}>
              <QRCode value={remoteUrl} size={160} />
            </div>
            <p style={{ fontSize: 12, color: "#7c3aed", wordBreak: "break-all", marginBottom: 16 }}>{remoteUrl}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 20px", background: "rgba(124,58,237,0.15)", borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: "#888" }}>Room Code:</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#a855f7", letterSpacing: 4 }}>{roomCode}</span>
            </div>
          </div>
        </div>
      )}

      {/* Karaoke Settings Modal */}
      {showSettings && <KaraokeSettings onClose={() => setShowSettings(false)} />}

      {/* Ranking Panel */}
      <RankingPanel
        isOpen={showRanking}
        onClose={() => setShowRanking(false)}
        currentSong={currentSong ? { youtubeId: currentSong.youtube_id, title: currentSong.title, artist: currentSong.artist } : null}
      />

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-120px) scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function KTVPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0d0d14", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>Loading room...</div>}>
      <KTVScreen />
    </Suspense>
  );
}
