"use client";
import { useRouter } from "next/navigation";
import { History, Play } from "lucide-react";
import { useQueue } from "@/context/QueueContext";
import { Song } from "@/types";
import Image from "next/image";

export default function HistoryPage() {
  const router = useRouter();
  const { history, playSong } = useQueue();

  const handlePlay = (song: Song) => {
    playSong(song);
    router.push(`/player?id=${song.youtubeId}&title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}&thumb=${encodeURIComponent(song.thumbnail)}`);
  };

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
        <History size={22} color="var(--accent-light)" />
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>Play History</h1>
        <span style={{ fontSize: 14, color: "var(--text-muted)" }}>({history.length})</span>
      </div>

      {history.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-secondary)" }}>
          <History size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
          <p>Nothing played yet</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {history.map((song, idx) => (
            <div
              key={`${song.id}-${idx}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 16px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                cursor: "pointer",
                transition: "border-color 0.15s ease",
              }}
              onClick={() => handlePlay(song)}
            >
              <span style={{ fontSize: 13, color: "var(--text-muted)", minWidth: 24, textAlign: "right" }}>{idx + 1}</span>
              <div style={{ width: 48, height: 36, borderRadius: 6, overflow: "hidden", flexShrink: 0, position: "relative" }}>
                <Image src={song.thumbnail} alt={song.title} fill style={{ objectFit: "cover" }} unoptimized />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.title}</p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{song.artist}</p>
              </div>
              <Play size={16} color="var(--accent-light)" />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
