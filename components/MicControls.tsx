"use client";
import { useState } from "react";
import { Volume2, Waves, Clock, ChevronDown, ChevronUp, Headphones, Mic, MicOff, Speaker, Bluetooth, CheckCircle, AlertTriangle } from "lucide-react";
import { MicPermissionStatus, MicSettings } from "@/hooks/useMicPassthrough";
import { useAudioDevices } from "@/hooks/useAudioDevices";

interface MicControlsProps {
  settings: MicSettings;
  onUpdate: (patch: Partial<MicSettings>) => void;
  isActive: boolean;
  permissionStatus: MicPermissionStatus;
  inputLevel: number;
  onToggle: () => void | Promise<void>;
}

interface SliderProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}

function Slider({ label, icon, value, min, max, step, display, onChange }: SliderProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--text-muted)" }}>{icon}</span>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-light)", minWidth: 40, textAlign: "right" }}>
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer", height: 4 }}
      />
    </div>
  );
}

function DeviceStatusBadge() {
  const deviceInfo = useAudioDevices();

  const iconMap: Record<string, React.ReactNode> = {
    headphones: <Headphones size={13} />,
    separate_mic: <Mic size={13} />,
    bluetooth: <Bluetooth size={13} />,
    builtin_risk: <AlertTriangle size={13} />,
    unknown: <Speaker size={13} />,
  };

  const colorMap: Record<string, string> = {
    headphones: "#69ff47",
    separate_mic: "#69ff47",
    bluetooth: "#69ff47",
    builtin_risk: "#ff9800",
    unknown: "#ff9800",
  };

  const color = colorMap[deviceInfo.setup] || "#ff9800";

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 8,
      minWidth: 0,
      padding: "10px 12px",
      background: deviceInfo.warningNeeded
        ? "rgba(255,152,0,0.08)"
        : "rgba(105,255,71,0.08)",
      border: `1px solid ${deviceInfo.warningNeeded ? "rgba(255,152,0,0.25)" : "rgba(105,255,71,0.25)"}`,
      borderRadius: 8,
    }}>
      <span style={{ color, marginTop: 1, flexShrink: 0 }}>
        {iconMap[deviceInfo.setup]}
      </span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 12, color, fontWeight: 600, marginBottom: 2 }}>
          {deviceInfo.message}
        </p>
        {deviceInfo.outputLabel && (
          <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4, overflowWrap: "anywhere" }}>
            Output: {deviceInfo.outputLabel}
            {deviceInfo.inputLabel ? ` · Mic: ${deviceInfo.inputLabel}` : ""}
          </p>
        )}
        {/* Scoring recommendation */}
        {!deviceInfo.warningNeeded && (
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, overflowWrap: "anywhere" }}>
            <CheckCircle size={10} style={{ display: "inline", marginRight: 4 }} />
            Your setup is compatible with voice scoring
          </p>
        )}
      </div>
    </div>
  );
}

const permissionCopy: Record<MicPermissionStatus, { label: string; color: string; detail: string }> = {
  unknown: { label: "Mic status unknown", color: "#ff9800", detail: "Press On to check browser permission." },
  unsupported: { label: "Mic unsupported", color: "#f44336", detail: "Use HTTPS, localhost, or a browser with microphone support." },
  prompt: { label: "Mic permission needed", color: "#ff9800", detail: "Press On and allow microphone access." },
  granted: { label: "Mic permission granted", color: "#69ff47", detail: "Speak to test the input meter." },
  denied: { label: "Mic permission blocked", color: "#f44336", detail: "Allow microphone access in site settings." },
};

export default function MicControls({ settings, onUpdate, isActive, permissionStatus, inputLevel, onToggle }: MicControlsProps) {
  const [expanded, setExpanded] = useState(false);
  const permission = permissionCopy[permissionStatus];

  return (
    <div style={{
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* Header toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 16px",
          borderBottom: expanded ? "1px solid var(--border)" : "none",
          minWidth: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "none",
            border: "none",
            color: "var(--text-primary)",
            cursor: "pointer",
            padding: 0,
            minWidth: 0,
            flex: 1,
            overflow: "hidden",
          }}
        >
          <Headphones size={15} color={isActive ? "var(--accent-light)" : "var(--text-muted)"} />
          <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Mic Effects</span>
          <span style={{ fontSize: 10, color: permission.color, border: `1px solid ${permission.color}`, padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
            {permissionStatus.toUpperCase()}
          </span>
          {isActive && (
            <span style={{ fontSize: 10, background: "var(--accent)", color: "white", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
              LIVE
            </span>
          )}
          {expanded ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
        </button>
        <button
          type="button"
          onClick={onToggle}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 10px",
            borderRadius: 8,
            border: "none",
            background: isActive ? "#ef4444" : "var(--accent)",
            color: "white",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {isActive ? <MicOff size={14} /> : <Mic size={14} />}
          {isActive ? "Off" : "On"}
        </button>
      </div>

      {expanded && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

          {/* Smart device status — replaces the static headphone warning */}
          <DeviceStatusBadge />

          <div style={{
            padding: "10px 12px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border)",
            borderRadius: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: permission.color }}>{permission.label}</span>
              <span style={{ fontSize: 11, color: isActive ? "#69ff47" : "var(--text-muted)", fontWeight: 700 }}>
                {isActive ? "LIVE" : "OFF"}
              </span>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4, marginBottom: 10 }}>
              {permission.detail}
            </p>
            <div style={{ height: 8, background: "var(--bg-secondary)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                width: `${Math.round(inputLevel * 100)}%`,
                height: "100%",
                background: inputLevel > 0.08 ? "#69ff47" : "var(--accent)",
                transition: "width 80ms linear",
              }} />
            </div>
            <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 5 }}>
              Input level {Math.round(inputLevel * 100)}%
            </p>
          </div>

          <label style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 12px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            cursor: "pointer",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <Volume2 size={13} color="var(--text-muted)" />
              <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700 }}>
                Browser Monitor
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings.monitorOutput}
              onChange={(event) => onUpdate({ monitorOutput: event.target.checked })}
              style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }}
            />
          </label>

          <Slider
            label="Mic Volume"
            icon={<Volume2 size={13} />}
            value={settings.volume}
            min={0} max={1} step={0.05}
            display={`${Math.round(settings.volume * 100)}%`}
            onChange={(v) => onUpdate({ volume: v })}
          />
          <Slider
            label="Reverb (Room Effect)"
            icon={<Waves size={13} />}
            value={settings.reverbMix}
            min={0} max={1} step={0.05}
            display={`${Math.round(settings.reverbMix * 100)}%`}
            onChange={(v) => onUpdate({ reverbMix: v })}
          />
          <Slider
            label="Reverb Decay"
            icon={<Clock size={13} />}
            value={settings.reverbDecay}
            min={0.3} max={4} step={0.1}
            display={`${settings.reverbDecay.toFixed(1)}s`}
            onChange={(v) => onUpdate({ reverbDecay: v })}
          />
          <Slider
            label="Echo Delay"
            icon={<Clock size={13} />}
            value={settings.echoDelay}
            min={0.05} max={0.8} step={0.01}
            display={`${Math.round(settings.echoDelay * 1000)}ms`}
            onChange={(v) => onUpdate({ echoDelay: v })}
          />
          <Slider
            label="Echo Feedback"
            icon={<Waves size={13} />}
            value={settings.echoFeedback}
            min={0} max={0.7} step={0.05}
            display={`${Math.round(settings.echoFeedback * 100)}%`}
            onChange={(v) => onUpdate({ echoFeedback: v })}
          />
        </div>
      )}
    </div>
  );
}
