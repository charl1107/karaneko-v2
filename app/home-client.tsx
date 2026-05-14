"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Mic2, TrendingUp, Music } from "lucide-react";
import SongCard from "@/components/SongCard";
import { useQueue } from "@/context/QueueContext";
import { Song } from "@/types";

const CATEGORIES = [
  { id: "pop", label: "🎵 Pop" },
  { id: "rock", label: "🎸 Rock" },
  { id: "kpop", label: "🇰🇷 K-Pop" },
  { id: "rnb", label: "🎷 R&B" },
  { id: "opm", label: "🇵🇭 OPM" },
  { id: "classic", label: "🏆 Classic" },
  { id: "hiphop", label: "🎤 Hip-Hop" },
  { id: "ballad", label: "💙 Ballad" },
];

export default function HomePage() {
  const router = useRouter();
  const { playSong, addToQueue, toggleFavorite, isFavorited } = useQueue();
  const [query, setQuery] = useState("");
  const [trending, setTrending] = useState<Song[]>([]);
  const [categoryResults, setCategoryResults] = useState<Song[]>([]);
  const [activeCategory, setActiveCategory] = useState("pop");
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingCategory, setLoadingCategory] = useState(false);

  useEffect(() => {
    fetch("/api/trending")
      .then((r) => r.json())
      .then((d) => { setTrending(d.songs || []); setLoadingTrending(false); })
      .catch(() => setLoadingTrending(false));
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      setLoadingCategory(true);
      fetch(`/api/category?category=${activeCategory}`)
        .then((r) => r.json())
        .then((d) => { setCategoryResults(d.songs || []); setLoadingCategory(false); })
        .catch(() => setLoadingCategory(false));
    });
  }, [activeCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handlePlay = (song: Song) => {
    playSong(song);
    router.push(`/player?id=${song.youtubeId}&title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}&thumb=${encodeURIComponent(song.thumbnail)}`);
  };

  return (
    <main className="home-page" style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
          <div className="home-hero-logo" style={{ width: 52, height: 52, borderRadius: 14, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Mic2 size={28} color="white" />
          </div>
          <h1 style={{ fontSize: "clamp(34px, 7vw, 42px)", fontWeight: 900 }}>
            Kara<span style={{ color: "var(--accent-light)" }}>neko</span>
          </h1>
        </div>
        <p style={{ fontSize: 18, color: "var(--text-secondary)", marginBottom: 32 }}>
          Search any song, sing along, get scored in real-time 🎤
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={{ maxWidth: 560, margin: "0 auto", position: "relative" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, or genres..."
            style={{
              width: "100%",
              padding: "16px 56px 16px 20px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-accent)",
              borderRadius: 12,
              color: "var(--text-primary)",
              fontSize: 16,
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "var(--accent)",
              border: "none",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Search size={18} />
          </button>
        </form>
      </div>

      {/* Trending */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <TrendingUp size={20} color="var(--accent-light)" />
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Trending Now</h2>
        </div>
        {loadingTrending ? (
          <div className="song-grid song-grid-compact" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ background: "var(--bg-card)", borderRadius: 12, aspectRatio: "16/9", opacity: 0.4 }} />
            ))}
          </div>
        ) : (
          <div className="song-grid song-grid-compact" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            {trending.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onPlay={handlePlay}
                onAddToQueue={addToQueue}
                onFavorite={toggleFavorite}
                isFavorited={isFavorited(song.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <Music size={20} color="var(--accent-light)" />
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Browse by Category</h2>
        </div>

        {/* Category tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: "1px solid",
                borderColor: activeCategory === cat.id ? "var(--accent)" : "var(--border)",
                background: activeCategory === cat.id ? "var(--accent)" : "transparent",
                color: activeCategory === cat.id ? "white" : "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loadingCategory ? (
          <div className="song-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: "var(--bg-card)", borderRadius: 12, aspectRatio: "16/9", opacity: 0.4 }} />
            ))}
          </div>
        ) : (
          <div className="song-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {categoryResults.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onPlay={handlePlay}
                onAddToQueue={addToQueue}
                onFavorite={toggleFavorite}
                isFavorited={isFavorited(song.id)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
