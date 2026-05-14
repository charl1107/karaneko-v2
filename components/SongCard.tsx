"use client";
import Image from "next/image";
import { Play, Heart, PlusCircle } from "lucide-react";
import { Song } from "@/types";

interface SongCardProps {
  song: Song;
  onPlay: (song: Song) => void;
  onAddToQueue?: (song: Song) => void;
  onFavorite?: (song: Song) => void;
  isFavorited?: boolean;
}

export default function SongCard({
  song,
  onPlay,
  onAddToQueue,
  onFavorite,
  isFavorited,
}: SongCardProps) {
  return (
    <div
      className="song-card"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
        <Image
          src={song.thumbnail}
          alt={song.title}
          fill
          style={{ objectFit: "cover" }}
          unoptimized
        />
        {/* Play overlay */}
        <div
          onClick={() => onPlay(song)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0,
            transition: "opacity 0.2s ease",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "1")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "0")}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Play size={22} color="white" fill="white" />
          </div>
        </div>
        {/* Category badge */}
        {song.category && (
          <span
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: "rgba(124,58,237,0.85)",
              color: "white",
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 4,
              backdropFilter: "blur(4px)",
            }}
          >
            {song.category}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "12px 14px" }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {song.title}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
          {song.artist}
        </p>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onPlay(song)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 0",
              background: "var(--accent)",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
          >
            <Play size={14} fill="white" />
            Sing
          </button>
          {onAddToQueue && (
            <button
              onClick={() => onAddToQueue(song)}
              title="Add to queue"
              style={{
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                cursor: "pointer",
                color: "var(--text-secondary)",
                transition: "all 0.15s ease",
              }}
            >
              <PlusCircle size={16} />
            </button>
          )}
          {onFavorite && (
            <button
              onClick={() => onFavorite(song)}
              title="Favorite"
              style={{
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                cursor: "pointer",
                color: isFavorited ? "#f43f5e" : "var(--text-secondary)",
                transition: "all 0.15s ease",
              }}
            >
              <Heart size={16} fill={isFavorited ? "#f43f5e" : "none"} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
