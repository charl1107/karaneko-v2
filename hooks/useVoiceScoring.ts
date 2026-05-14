"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { ScoreResult } from "@/types";
import { getPreferredAudioConstraints } from "@/hooks/audioInputSelection";

interface ScoringState {
  isListening: boolean;
  currentPitch: number;
  volume: number;
  pitchAccuracy: number;
  timingAccuracy: number;
  stability: number;
  combo: number;
  totalScore: number;
  finalScore: ScoreResult | null;
  error: string | null;
}

const INITIAL_LIVE_SCORE = 50;
const MIN_VOICE_HZ = 75;
const MAX_VOICE_HZ = 1200;
const MIN_SINGING_GATE = 0.014;
const BACKGROUND_MULTIPLIER = 1.55;

function closeAudioContext(ctx: AudioContext | null) {
  if (!ctx || ctx.state === "closed") return;
  void ctx.close().catch(() => {});
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[], fallback = 0): number {
  if (values.length === 0) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function hzToMidi(hz: number): number {
  return 12 * Math.log2(hz / 440) + 69;
}

function normalizePitchNearReference(pitch: number, reference: number | null): number {
  if (!reference || pitch <= 0) return pitch;

  let normalized = pitch;
  while (hzToMidi(normalized) - hzToMidi(reference) > 7 && normalized / 2 >= MIN_VOICE_HZ) normalized /= 2;
  while (hzToMidi(reference) - hzToMidi(normalized) > 7 && normalized * 2 <= MAX_VOICE_HZ) normalized *= 2;

  return normalized;
}

function detectPitchACF(buffer: Float32Array, sampleRate: number): number {
  const size = buffer.length;
  const maxSamples = Math.floor(size / 2);

  let rms = 0;
  let peak = 0;
  for (let i = 0; i < size; i++) {
    const sample = buffer[i];
    rms += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.012 || peak < 0.018) return 0;

  const normalized = new Float32Array(size);
  for (let i = 0; i < size; i++) normalized[i] = buffer[i] / peak;

  const corr = new Float32Array(maxSamples);
  for (let lag = 0; lag < maxSamples; lag++) {
    let sum = 0;
    for (let i = 0; i < maxSamples; i++) {
      sum += normalized[i] * normalized[i + lag];
    }
    corr[lag] = sum / maxSamples;
  }

  let firstDip = 0;
  for (let i = 1; i < maxSamples - 1; i++) {
    if (corr[i] < corr[i + 1]) {
      firstDip = i;
      break;
    }
  }

  let bestLag = -1;
  let bestCorr = 0.48;
  for (let i = firstDip; i < maxSamples - 1; i++) {
    if (corr[i] > bestCorr && corr[i] > corr[i - 1] && corr[i] >= corr[i + 1]) {
      bestCorr = corr[i];
      bestLag = i;
    }
  }

  if (bestLag <= 0) return 0;

  const prev = corr[bestLag - 1];
  const curr = corr[bestLag];
  const next = corr[bestLag + 1];
  const denominator = 2 * (prev - 2 * curr + next);
  const refinedLag = denominator === 0 ? bestLag : bestLag + (prev - next) / denominator;
  const freq = sampleRate / refinedLag;

  if (freq < MIN_VOICE_HZ || freq > MAX_VOICE_HZ) return 0;
  return freq;
}

export function useVoiceScoring() {
  const [state, setState] = useState<ScoringState>({
    isListening: false,
    currentPitch: 0,
    volume: 0,
    pitchAccuracy: INITIAL_LIVE_SCORE,
    timingAccuracy: INITIAL_LIVE_SCORE,
    stability: INITIAL_LIVE_SCORE,
    combo: 0,
    totalScore: INITIAL_LIVE_SCORE,
    finalScore: null,
    error: null,
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const pitchSamplesRef = useRef<number[]>([]);
  const volumeSamplesRef = useRef<number[]>([]);
  const voiceEnergyRef = useRef<number[]>([]);
  const frameScoresRef = useRef<number[]>([]);
  const totalFramesRef = useRef(0);
  const singingFramesRef = useRef(0);
  const silenceFramesRef = useRef(0);
  const noiseFloorRef = useRef(0.018);
  const smoothedPitchRef = useRef<number | null>(null);
  const liveScoreRef = useRef(INITIAL_LIVE_SCORE);
  const comboRef = useRef(0);

  const scoreFrame = useCallback((pitch: number, rms: number, peak: number) => {
    totalFramesRef.current += 1;
    volumeSamplesRef.current.push(rms);
    if (volumeSamplesRef.current.length > 240) volumeSamplesRef.current.shift();

    // The reference karaoke site uses a simple analyser-style flow: count
    // singing frames and silence frames, then move a live score from 50.
    // Keep the floor adaptive so normal mics and noisy V8 inputs both work.
    if (rms < noiseFloorRef.current * 1.25) {
      noiseFloorRef.current = noiseFloorRef.current * 0.98 + rms * 0.02;
    }

    const gate = Math.max(MIN_SINGING_GATE, noiseFloorRef.current * BACKGROUND_MULTIPLIER);
    const peakGate = Math.max(gate * 1.25, 0.025);
    const voiceEnergy = gate > 0 ? (rms - gate) / gate : 0;
    const hasVoiceEnergy = rms >= gate && peak >= peakGate && voiceEnergy > 0.08;
    const hasPitch = pitch > 0;
    const isSinging = hasVoiceEnergy || (hasPitch && rms >= gate * 0.75);

    if (isSinging) {
      singingFramesRef.current += 1;
      silenceFramesRef.current = 0;
      comboRef.current = Math.min(comboRef.current + 1, 100);
    } else {
      silenceFramesRef.current += 1;
      comboRef.current = Math.max(comboRef.current - 2, 0);
    }

    const normalizedPitch = hasPitch ? normalizePitchNearReference(pitch, smoothedPitchRef.current) : 0;
    if (normalizedPitch > 0) {
      smoothedPitchRef.current = smoothedPitchRef.current
        ? smoothedPitchRef.current * 0.72 + normalizedPitch * 0.28
        : normalizedPitch;
      pitchSamplesRef.current.push(normalizedPitch);
      if (pitchSamplesRef.current.length > 120) pitchSamplesRef.current.shift();
    }

    if (isSinging) {
      voiceEnergyRef.current.push(clamp(voiceEnergy * 34 + 64));
      if (voiceEnergyRef.current.length > 120) voiceEnergyRef.current.shift();
    }

    const participation = totalFramesRef.current > 0 ? singingFramesRef.current / totalFramesRef.current : 0;
    const silencePenalty = clamp(silenceFramesRef.current / 90, 0, 1) * 18;
    const energyScore = average(voiceEnergyRef.current, isSinging ? 70 : 50);

    const recentMidi = pitchSamplesRef.current.slice(-24).map(hzToMidi);
    const stabilityScore = recentMidi.length >= 5
      ? clamp(100 - standardDeviation(recentMidi) * 18, 45, 100)
      : isSinging
        ? 70
        : 50;

    // Live score starts at 50 and moves mainly with singing vs silence. Pitch is
    // still detected for display, but it is not the strict scoring driver.
    const frameScore = clamp(
      50 +
      participation * 30 +
      (energyScore - 50) * 0.35 +
      (stabilityScore - 50) * 0.15 +
      comboRef.current * 0.08 -
      silencePenalty
    );

    liveScoreRef.current = liveScoreRef.current * 0.9 + frameScore * 0.1;
    frameScoresRef.current.push(liveScoreRef.current);

    setState(prev => ({
      ...prev,
      currentPitch: Math.round(smoothedPitchRef.current || 0),
      volume: rms,
      pitchAccuracy: Math.round(clamp(stabilityScore)),
      timingAccuracy: Math.round(clamp(participation * 100)),
      stability: Math.round(clamp(energyScore)),
      combo: comboRef.current,
      totalScore: Math.round(clamp(liveScoreRef.current)),
    }));
  }, []);

  const startListening = useCallback(async () => {
    try {
      const labelStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      labelStream.getTracks().forEach((track) => track.stop());
      const audio = await getPreferredAudioConstraints({
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      });
      const stream = await navigator.mediaDevices.getUserMedia({ audio });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.08;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      pitchSamplesRef.current = [];
      volumeSamplesRef.current = [];
      voiceEnergyRef.current = [];
      frameScoresRef.current = [];
      totalFramesRef.current = 0;
      singingFramesRef.current = 0;
      silenceFramesRef.current = 0;
      noiseFloorRef.current = 0.018;
      smoothedPitchRef.current = null;
      liveScoreRef.current = INITIAL_LIVE_SCORE;
      comboRef.current = 0;

      setState(prev => ({
        ...prev,
        isListening: true,
        error: null,
        finalScore: null,
        pitchAccuracy: INITIAL_LIVE_SCORE,
        timingAccuracy: INITIAL_LIVE_SCORE,
        stability: INITIAL_LIVE_SCORE,
        totalScore: INITIAL_LIVE_SCORE,
      }));

      const buffer = new Float32Array(analyser.fftSize);

      const tick = () => {
        analyser.getFloatTimeDomainData(buffer);

        let rms = 0;
        let peak = 0;
        for (let i = 0; i < buffer.length; i++) {
          const sample = buffer[i];
          rms += sample * sample;
          peak = Math.max(peak, Math.abs(sample));
        }
        rms = Math.sqrt(rms / buffer.length);

        const pitch = detectPitchACF(buffer, ctx.sampleRate);
        scoreFrame(pitch, rms, peak);

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setState(prev => ({ ...prev, error: "Microphone access denied. Please allow microphone permissions." }));
    }
  }, [scoreFrame]);

  const stopListening = useCallback((): ScoreResult | null => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
    closeAudioContext(audioCtxRef.current);
    audioCtxRef.current = null;
    streamRef.current = null;

    if (totalFramesRef.current === 0) {
      setState(prev => ({ ...prev, isListening: false }));
      return null;
    }

    const participation = totalFramesRef.current > 0 ? singingFramesRef.current / totalFramesRef.current : 0;
    const avgScore = average(frameScoresRef.current, liveScoreRef.current);
    const avgEnergy = average(voiceEnergyRef.current, 50);
    const recentMidi = pitchSamplesRef.current.map(hzToMidi);
    const avgStability = recentMidi.length >= 5
      ? clamp(100 - standardDeviation(recentMidi) * 18, 45, 100)
      : Math.max(45, avgEnergy);

    const total = Math.round(clamp(avgScore));
    const rank: ScoreResult["rank"] =
      total >= 90 ? "S" : total >= 75 ? "A" : total >= 60 ? "B" : total >= 45 ? "C" : "D";

    const finalScore = {
      pitch: Math.round(avgStability),
      timing: Math.round(clamp(participation * 100)),
      stability: Math.round(clamp(avgEnergy)),
      total,
      rank,
    };

    setState(prev => ({
      ...prev,
      isListening: false,
      finalScore,
    }));

    return finalScore;
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
      closeAudioContext(audioCtxRef.current);
      audioCtxRef.current = null;
      streamRef.current = null;
    };
  }, []);

  return { ...state, startListening, stopListening };
}
