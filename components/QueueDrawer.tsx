"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ListMusic, Play, SkipForward, Trash2, X } from "lucide-react";
import { QueueItem, Song } from "@/types";
import { useQueue } from "@/context/QueueContext";

function playerUrl(song: Song) {
  return `/player?id=${song.youtubeId}&title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}&thumb=${encodeURIComponent(song.thumbnail)}`;
}

export default function QueueDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { queue, currentSong, removeFromQueue, playNext, playQueueItem, clearQueue } = useQueue();

  const startNext = () => {
    const next = playNext();
    if (next) {
      router.push(playerUrl(next));
      onClose();
    }
  };

  const playItem = (item: QueueItem) => {
    const next = playQueueItem(item.queueId);
    if (next) {
      router.push(playerUrl(next));
      onClose();
    }
  };

  if (!open) return null;

  return (
    <>
      <button
        aria-label="Close queue"
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 80, border: "none", background: "rgba(0,0,0,0.55)", cursor: "pointer" }}
      />
      <aside style={{ position: "fixed", top: 0, right: 0, zIndex: 90, width: "min(420px, 100vw)", height: "100vh", background: "var(--bg-primary)", borderLeft: "1px solid var(--border)", boxShadow: "-16px 0 40px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 64, padding: "0 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ListMusic size={18} color="var(--accent-light)" />
            <div>
              <p style={{ fontSize: 15, fontWeight: 700 }}>Queue</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{queue.length} up next</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close queue" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        {currentSong && (
          <div style={{ padding: 18, borderBottom: "1px solid var(--border)", background: "rgba(124,58,237,0.08)" }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0 }}>Now singing</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 72, height: 42, position: "relative", borderRadius: 6, overflow: "hidden", background: "var(--bg-secondary)", flexShrink: 0 }}>
                <Image src={currentSong.thumbnail} alt={currentSong.title} fill style={{ objectFit: "cover" }} unoptimized />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentSong.title}</p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentSong.artist}</p>
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: 14, display: "flex", gap: 8, borderBottom: "1px solid var(--border)" }}>
          <button onClick={startNext} disabled={queue.length === 0} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 12px", borderRadius: 8, border: "none", background: queue.length ? "var(--accent)" : "var(--bg-card)", color: queue.length ? "white" : "var(--text-muted)", fontSize: 13, fontWeight: 700, cursor: queue.length ? "pointer" : "default" }}>
            <SkipForward size={15} /> Play next
          </button>
          <button onClick={clearQueue} disabled={queue.length === 0} style={{ width: 42, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: queue.length ? "#f87171" : "var(--text-muted)", cursor: queue.length ? "pointer" : "default" }}>
            <Trash2 size={15} />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {queue.length === 0 ? (
            <div style={{ padding: "64px 24px", textAlign: "center", color: "var(--text-secondary)" }}>
              <ListMusic size={40} style={{ opacity: 0.35, marginBottom: 14 }} />
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No songs queued</p>
              <p style={{ fontSize: 13 }}>Press Queue on any karaoke song to line it up.</p>
            </div>
          ) : (
            queue.map((item, idx) => (
              <div key={item.queueId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ width: 20, textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{idx + 1}</span>
                <div style={{ width: 64, height: 38, position: "relative", borderRadius: 6, overflow: "hidden", background: "var(--bg-secondary)", flexShrink: 0 }}>
                  <Image src={item.thumbnail} alt={item.title} fill style={{ objectFit: "cover" }} unoptimized />
                </div>
                <button onClick={() => playItem(item)} style={{ minWidth: 0, flex: 1, textAlign: "left", background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</p>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.artist}</p>
                </button>
                <button onClick={() => playItem(item)} aria-label="Play queued song" style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--accent-light)", cursor: "pointer" }}>
                  <Play size={14} fill="currentColor" />
                </button>
                <button onClick={() => removeFromQueue(item.queueId)} aria-label="Remove queued song" style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
