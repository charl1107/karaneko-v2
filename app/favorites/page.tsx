"use client";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import SongCard from "@/components/SongCard";
import { useQueue } from "@/context/QueueContext";
import { Song } from "@/types";

export default function FavoritesPage() {
  const router = useRouter();
  const { favorites, playSong, addToQueue, toggleFavorite, isFavorited } = useQueue();

  const handlePlay = (song: Song) => {
    playSong(song);
    router.push(`/player?id=${song.youtubeId}&title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}&thumb=${encodeURIComponent(song.thumbnail)}`);
  };

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
        <Heart size={22} color="#f43f5e" fill="#f43f5e" />
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>Favorites</h1>
        <span style={{ fontSize: 14, color: "var(--text-muted)" }}>({favorites.length})</span>
      </div>

      {favorites.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-secondary)" }}>
          <Heart size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
          <p style={{ marginBottom: 8 }}>No favorites yet</p>
          <p style={{ fontSize: 14 }}>Heart a song to save it here</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {favorites.map((song) => (
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
    </main>
  );
}
