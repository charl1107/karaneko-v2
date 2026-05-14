"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  getDefaultAudioOutput,
  getPreferredAudioConstraints,
  getPreferredAudioInput,
  hasSharedAudioHardware,
  isLoopbackRiskInput,
  isPassthroughFeedbackRiskInput,
} from "@/hooks/audioInputSelection";

export interface MicSettings {
  volume: number;       // 0-1 mic volume in mix
  reverbMix: number;    // 0-1 wet/dry reverb
  reverbDecay: number;  // seconds
  echoDelay: number;    // seconds
  echoFeedback: number; // 0-1
  monitorOutput: boolean; // route browser mic monitoring to speakers
  enabled: boolean;
}

export type MicPermissionStatus = "unknown" | "unsupported" | "prompt" | "granted" | "denied";

export const DEFAULT_MIC_SETTINGS: MicSettings = {
  volume: 0.35,
  reverbMix: 0,
  reverbDecay: 1.8,
  echoDelay: 0.22,
  echoFeedback: 0,
  monitorOutput: false,
  enabled: false,
};

function closeAudioContext(ctx: AudioContext | null) {
  if (!ctx || ctx.state === "closed") return;
  void ctx.close().catch(() => {});
}

export function useMicPassthrough() {
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState<MicSettings>(DEFAULT_MIC_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<MicPermissionStatus>("unknown");
  const [inputLevel, setInputLevel] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const gainRef = useRef<GainNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const delayRef = useRef<DelayNode | null>(null);
  const feedbackRef = useRef<GainNode | null>(null);
  const delayOutputGainRef = useRef<GainNode | null>(null);
  const forceMutedRef = useRef(false);

  // Build reverb impulse response (synthetic reverb)
  const buildReverb = useCallback((ctx: AudioContext, decay: number): ConvolverNode => {
    const convolver = ctx.createConvolver();
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * decay;
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    convolver.buffer = impulse;
    return convolver;
  }, []);

  const refreshPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionStatus("unsupported");
      return "unsupported" as const;
    }

    if (!navigator.permissions?.query) {
      setPermissionStatus("unknown");
      return "unknown" as const;
    }

    try {
      const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
      const update = () => setPermissionStatus(status.state as MicPermissionStatus);
      update();
      status.onchange = update;
      return status.state as MicPermissionStatus;
    } catch {
      setPermissionStatus("unknown");
      return "unknown" as const;
    }
  }, []);

  const start = useCallback(async (currentSettings: MicSettings) => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionStatus("unsupported");
        setError("This browser or page cannot access a microphone. Use HTTPS or localhost.");
        return;
      }

      await refreshPermission();
      const labelStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      labelStream.getTracks().forEach((t) => t.stop());
      const preferredInput = await getPreferredAudioInput();
      const defaultOutput = await getDefaultAudioOutput();
      const mutePassthrough =
        Boolean(preferredInput?.label && defaultOutput?.label && hasSharedAudioHardware(preferredInput.label, defaultOutput.label)) ||
        Boolean(preferredInput?.label && isLoopbackRiskInput(preferredInput.label)) ||
        Boolean(preferredInput?.label && isPassthroughFeedbackRiskInput(preferredInput.label));
      forceMutedRef.current = mutePassthrough;
      const audio = await getPreferredAudioConstraints();
      const stream = await navigator.mediaDevices.getUserMedia({ audio });
      streamRef.current = stream;
      setPermissionStatus("granted");

      const ctx = new AudioContext();
      ctxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.15;
      analyserRef.current = analyser;

      // Master gain (mic volume)
      const masterGain = ctx.createGain();
      masterGain.gain.value = currentSettings.monitorOutput && !mutePassthrough ? currentSettings.volume : 0;
      gainRef.current = masterGain;

      // ── Reverb path ──
      const reverb = buildReverb(ctx, currentSettings.reverbDecay);
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = currentSettings.reverbMix;
      reverbGainRef.current = reverbGain;

      // ── Dry path ──
      const dryGain = ctx.createGain();
      dryGain.gain.value = 1 - currentSettings.reverbMix;
      dryGainRef.current = dryGain;

      // ── Echo path ──
      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = currentSettings.echoDelay;
      delayRef.current = delay;

      const feedbackGain = ctx.createGain();
      feedbackGain.gain.value = currentSettings.echoFeedback;
      feedbackRef.current = feedbackGain;

      const delayOutputGain = ctx.createGain();
      delayOutputGain.gain.value = currentSettings.echoFeedback;
      delayOutputGainRef.current = delayOutputGain;

      // Always meter the selected input. Only monitor it when it cannot loop
      // the same audio device back into itself.
      source.connect(analyser);
      source.connect(masterGain);

        // masterGain → dry path → output
      masterGain.connect(dryGain);
      dryGain.connect(ctx.destination);

        // masterGain → reverb → reverbGain → output
      masterGain.connect(reverb);
      reverb.connect(reverbGain);
      reverbGain.connect(ctx.destination);

        // masterGain → delay → feedbackGain → delay (loop) + output
      masterGain.connect(delay);
      delay.connect(feedbackGain);
      feedbackGain.connect(delay);
      delay.connect(delayOutputGain);
      delayOutputGain.connect(ctx.destination);

      setIsActive(true);
      setError(
        mutePassthrough
          ? "Mic monitoring was muted because your mic or V8 soundcard can feed speaker audio back into the mic. This prevents YouTube music feedback."
          : currentSettings.monitorOutput
            ? null
            : "Browser mic monitoring is off. This prevents V8 music bleed from being played back by the app."
      );

      const buffer = new Float32Array(analyser.fftSize);
      const tick = () => {
        analyser.getFloatTimeDomainData(buffer);
        let rms = 0;
        for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
        rms = Math.sqrt(rms / buffer.length);
        setInputLevel(Math.min(1, rms * 8));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setPermissionStatus("denied");
        setError("Microphone permission is blocked. Allow mic access in your browser site settings, then try again.");
      } else if (name === "NotFoundError") {
        setError("No microphone was found. Connect or enable an input device, then try again.");
      } else {
        setError("Could not start microphone monitoring. Check your input device and browser permissions.");
      }
    }
  }, [buildReverb, refreshPermission]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    closeAudioContext(ctxRef.current);
    ctxRef.current = null;
    streamRef.current = null;
    analyserRef.current = null;
    gainRef.current = null;
    reverbGainRef.current = null;
    dryGainRef.current = null;
    delayRef.current = null;
    feedbackRef.current = null;
    delayOutputGainRef.current = null;
    forceMutedRef.current = false;
    setInputLevel(0);
    setIsActive(false);
  }, []);

  const toggle = useCallback(async () => {
    if (isActive) {
      stop();
    } else {
      await start(settings);
    }
  }, [isActive, settings, start, stop]);

  // Live-update gain when settings change without restarting
  const updateSettings = useCallback((patch: Partial<MicSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };

      // Apply live changes to audio nodes
      if (gainRef.current) gainRef.current.gain.value = next.monitorOutput && !forceMutedRef.current ? next.volume : 0;
      if (reverbGainRef.current) reverbGainRef.current.gain.value = next.reverbMix;
      if (dryGainRef.current) dryGainRef.current.gain.value = 1 - next.reverbMix;
      if (delayRef.current) delayRef.current.delayTime.value = next.echoDelay;
      if (feedbackRef.current) feedbackRef.current.gain.value = next.echoFeedback;
      if (delayOutputGainRef.current) delayOutputGainRef.current.gain.value = next.echoFeedback;

      return next;
    });
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => refreshPermission());
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      closeAudioContext(ctxRef.current);
      ctxRef.current = null;
      streamRef.current = null;
      gainRef.current = null;
      reverbGainRef.current = null;
      dryGainRef.current = null;
      delayRef.current = null;
      feedbackRef.current = null;
      delayOutputGainRef.current = null;
      forceMutedRef.current = false;
    };
  }, [refreshPermission]);

  return { isActive, settings, error, permissionStatus, inputLevel, refreshPermission, toggle, updateSettings, stop };
}
