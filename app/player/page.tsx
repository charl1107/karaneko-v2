"use client";
import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import KaraokePlayer from "@/components/KaraokePlayer";
import { useQueue } from "@/context/QueueContext";
import { Song } from "@/types";

function PlayerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentSong, playSong } = useQueue();

  const id = searchParams.get("id") || "";
  const title = searchParams.get("title") || "Unknown Song";
  const artist = searchParams.get("artist") || "Unknown Artist";
  const thumb = searchParams.get("thumb") || "";

  // Build song from URL params if not in context
  const song: Song = useMemo(() => currentSong || {
    id,
    youtubeId: id,
    title,
    artist,
    thumbnail: thumb,
    category: "Karaoke",
  }, [artist, currentSong, id, thumb, title]);

  useEffect(() => {
    if (!currentSong && id) playSong(song);
  }, [currentSong, id, playSong, song]);

  if (!id) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--text-secondary)" }}>
        <p>No song selected. <button onClick={() => router.push("/")} style={{ color: "var(--accent-light)", background: "none", border: "none", cursor: "pointer" }}>Go home</button></p>
      </div>
    );
  }

  return (
    <main className="player-page" style={{ maxWidth: 1440, margin: "0 auto", padding: "24px" }}>
      <button
        onClick={() => router.back()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontSize: 14,
          marginBottom: 18,
        }}
      >
        <ArrowLeft size={16} /> Back
      </button>
      <KaraokePlayer song={song} />
    </main>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "var(--text-secondary)" }}>Loading player...</div>}>
      <PlayerContent />
    </Suspense>
  );
}
