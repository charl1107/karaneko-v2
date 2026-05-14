"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, ArrowLeft } from "lucide-react";
import SongCard from "@/components/SongCard";
import { useQueue } from "@/context/QueueContext";
import { Song } from "@/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { playSong, addToQueue, toggleFavorite, isFavorited } = useQueue();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.songs || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (!q) return;
    Promise.resolve().then(() => {
      setQuery(q);
      doSearch(q);
    });
  }, [doSearch, searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handlePlay = (song: Song) => {
    playSong(song);
    router.push(`/player?id=${song.youtubeId}&title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}&thumb=${encodeURIComponent(song.thumbnail)}`);
  };

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      {/* Back + search */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <button
          onClick={() => router.push("/")}
          style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center" }}
        >
          <ArrowLeft size={20} />
        </button>
        <form onSubmit={handleSubmit} style={{ flex: 1, position: "relative" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists..."
            autoFocus
            style={{
              width: "100%",
              padding: "12px 48px 12px 16px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-accent)",
              borderRadius: 10,
              color: "var(--text-primary)",
              fontSize: 15,
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
              background: "var(--accent)",
              border: "none",
              borderRadius: 6,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "white",
            }}
          >
            <Search size={15} />
          </button>
        </form>
      </div>

      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ background: "var(--bg-card)", borderRadius: 12, aspectRatio: "16/9", opacity: 0.4 }} />
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
          <Search size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>No results found for &quot;{query}&quot;</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
            {results.length} results for &quot;<strong style={{ color: "var(--text-primary)" }}>{query}</strong>&quot;
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {results.map((song) => (
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
        </>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "var(--text-secondary)" }}>Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
