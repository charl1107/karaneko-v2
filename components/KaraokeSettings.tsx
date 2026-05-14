"use client";
import { X } from "lucide-react";
import { useRoomSettings } from "@/context/RoomSettingsContext";

interface KaraokeSettingsProps {
  onClose: () => void;
}

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 3 }}>{label}</p>
        <p style={{ fontSize: 12, color: "#888", lineHeight: 1.4 }}>{description}</p>
      </div>
      {/* Toggle switch */}
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 46,
          height: 26,
          borderRadius: 13,
          background: value ? "#22c55e" : "#333",
          position: "relative",
          cursor: "pointer",
          flexShrink: 0,
          transition: "background 0.2s ease",
        }}
      >
        <div style={{
          position: "absolute",
          top: 3,
          left: value ? 23 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "white",
          transition: "left 0.2s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </div>
    </div>
  );
}

export default function KaraokeSettings({ onClose }: KaraokeSettingsProps) {
  const { settings, updateSettings } = useRoomSettings();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#1a1a2e",
          border: "1px solid rgba(124,58,237,0.3)",
          borderRadius: 16,
          padding: "28px 28px 24px",
          width: "100%",
          maxWidth: 380,
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "rgba(255,255,255,0.06)",
            border: "none",
            borderRadius: 6,
            color: "#888",
            cursor: "pointer",
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={14} />
        </button>

        {/* Title */}
        <h2 style={{ fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 24, color: "white" }}>
          ⚙️ Karaoke Settings
        </h2>

        {/* Scoring System */}
        <div style={{ marginBottom: 24 }}>
          <ToggleRow
            label="Scoring System"
            description="Use microphone to rate your singing performance"
            value={settings.scoringEnabled}
            onChange={(v) => updateSettings({ scoringEnabled: v })}
          />
        </div>

        {/* Divider + Remote Permissions */}
        <div style={{ marginBottom: 16 }}>
          <p style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#7c9aff",
            textAlign: "center",
            marginBottom: 20,
            letterSpacing: "0.3px",
          }}>
            Remote Permissions
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <ToggleRow
              label="Remote Deletion"
              description="Allow remote users to delete queued songs"
              value={settings.remoteDeleteEnabled}
              onChange={(v) => updateSettings({ remoteDeleteEnabled: v })}
            />
            <ToggleRow
              label="Remote Reordering"
              description="Allow remote users to move queued songs"
              value={settings.remoteReorderEnabled}
              onChange={(v) => updateSettings({ remoteReorderEnabled: v })}
            />
          </div>
        </div>

        {/* Close button */}
        <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 48px",
              background: "#2a2a3e",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 24,
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
