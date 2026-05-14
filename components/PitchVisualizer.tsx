"use client";
import { useEffect, useRef } from "react";

// Frequency -> musical note name
function freqToNote(freq: number): string {
  if (freq <= 0) return "";
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const semitones = Math.round(12 * Math.log2(freq / 440)) + 69;
  const octave = Math.floor(semitones / 12) - 1;
  const note = noteNames[((semitones % 12) + 12) % 12];
  return `${note}${octave}`;
}

// Pitch difference in semitones
function pitchDiff(actual: number, expected: number): number {
  if (actual <= 0 || expected <= 0) return 0;
  return 12 * Math.log2(actual / expected);
}

export type PitchStatus = "perfect" | "too_high" | "too_low" | "off" | "silent";

interface PitchPoint {
  time: number;    // ms timestamp
  pitch: number;   // Hz
  status: PitchStatus;
}

interface PitchVisualizerProps {
  currentPitch: number;       // Hz from mic
  expectedPitch?: number;     // Hz from melody reference (optional)
  isActive: boolean;
  onStatusChange?: (status: PitchStatus) => void;
}

const STATUS_COLORS: Record<PitchStatus, string> = {
  perfect:  "#69ff47",
  too_high: "#ff9800",
  too_low:  "#00e5ff",
  off:      "#f44336",
  silent:   "#444466",
};

const WINDOW_MS = 4000; // show last 4 seconds
const CANVAS_H = 120;

export default function PitchVisualizer({
  currentPitch,
  expectedPitch,
  isActive,
  onStatusChange,
}: PitchVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<PitchPoint[]>([]);
  const animRef = useRef<number>(0);
  const lastStatusRef = useRef<PitchStatus>("silent");

  // Determine current status
  const getStatus = (actual: number, expected?: number): PitchStatus => {
    if (actual <= 0) return "silent";
    if (!expected || expected <= 0) {
      // No reference: just check if in vocal range
      return actual > 80 && actual < 1100 ? "perfect" : "off";
    }
    const diff = pitchDiff(actual, expected);
    if (Math.abs(diff) <= 0.5) return "perfect";
    if (diff > 0.5 && diff <= 2) return "too_high";
    if (diff < -0.5 && diff >= -2) return "too_low";
    if (diff > 2) return "too_high";
    return "too_low";
  };

  // Push new data point
  useEffect(() => {
    if (!isActive) return;
    const status = getStatus(currentPitch, expectedPitch);
    historyRef.current.push({ time: Date.now(), pitch: currentPitch, status });

    // Trim old points
    const cutoff = Date.now() - WINDOW_MS - 500;
    historyRef.current = historyRef.current.filter((p) => p.time > cutoff);

    if (status !== lastStatusRef.current) {
      lastStatusRef.current = status;
      onStatusChange?.(status);
    }
  }, [currentPitch, expectedPitch, isActive, onStatusChange]);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = "#0a0a14";
      ctx.fillRect(0, 0, W, H);

      // Grid lines (horizontal)
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (H / 4) * i);
        ctx.lineTo(W, (H / 4) * i);
        ctx.stroke();
      }

      // Pitch range for Y axis: 80-800 Hz (log scale)
      const MIN_FREQ = 80;
      const MAX_FREQ = 800;
      const freqToY = (freq: number) => {
        if (freq <= 0) return H / 2;
        const logMin = Math.log2(MIN_FREQ);
        const logMax = Math.log2(MAX_FREQ);
        const logF = Math.log2(Math.max(MIN_FREQ, Math.min(MAX_FREQ, freq)));
        return H - ((logF - logMin) / (logMax - logMin)) * H;
      };

      const now = Date.now();
      const timeToX = (t: number) => ((t - (now - WINDOW_MS)) / WINDOW_MS) * W;

      // Draw expected pitch line (if available)
      if (expectedPitch && expectedPitch > 0) {
        const ey = freqToY(expectedPitch);
        ctx.strokeStyle = "rgba(124,58,237,0.5)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(0, ey);
        ctx.lineTo(W, ey);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = "rgba(124,58,237,0.8)";
        ctx.font = "10px monospace";
        ctx.fillText(freqToNote(expectedPitch), 4, ey - 4);
      }

      // Draw voice pitch history
      const points = historyRef.current.filter((p) => p.time > now - WINDOW_MS);
      if (points.length > 1) {
        // Group by status for color segments
        let i = 0;
        while (i < points.length) {
          const segStatus = points[i].status;
          ctx.beginPath();
          ctx.strokeStyle = STATUS_COLORS[segStatus];
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          let j = i;
          while (j < points.length && points[j].status === segStatus) {
            const x = timeToX(points[j].time);
            const y = points[j].pitch > 0 ? freqToY(points[j].pitch) : H / 2;
            if (j === i) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            j++;
          }
          ctx.stroke();
          i = j;
        }

        // Dot at current position
        const last = points[points.length - 1];
        if (last.pitch > 0) {
          const x = timeToX(last.time);
          const y = freqToY(last.pitch);
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fillStyle = STATUS_COLORS[last.status];
          ctx.fill();

          // Note label
          ctx.fillStyle = "white";
          ctx.font = "bold 11px monospace";
          ctx.fillText(freqToNote(last.pitch), Math.min(x + 8, W - 30), y - 6);
        }
      }

      // "NOW" line
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W - 2, 0);
      ctx.lineTo(W - 2, H);
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [expectedPitch]);

  // Clear history when stopped
  useEffect(() => {
    if (!isActive) historyRef.current = [];
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={CANVAS_H}
      style={{
        width: "100%",
        height: CANVAS_H,
        borderRadius: 8,
        display: "block",
      }}
    />
  );
}
