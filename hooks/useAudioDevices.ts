"use client";
import { useState, useEffect } from "react";
import {
  getDefaultAudioOutput,
  getPreferredAudioInput,
  hasSharedAudioHardware,
  isLoopbackRiskInput,
  isPassthroughFeedbackRiskInput,
} from "@/hooks/audioInputSelection";

export type AudioSetup =
  | "headphones"      // headphones detected → safe
  | "separate_mic"    // different input/output device → safe
  | "bluetooth"       // bluetooth speaker → likely safe
  | "builtin_risk"    // built-in speaker + built-in mic → feedback risk
  | "unknown";        // can't detect

export interface AudioDeviceInfo {
  setup: AudioSetup;
  outputLabel: string;
  inputLabel: string;
  warningNeeded: boolean;
  message: string;
}

export function useAudioDevices(): AudioDeviceInfo {
  const [info, setInfo] = useState<AudioDeviceInfo>({
    setup: "unknown",
    outputLabel: "",
    inputLabel: "",
    warningNeeded: false,
    message: "",
  });

  useEffect(() => {
    async function detect() {
      try {
        // Need permission first to get labels
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter(d => d.kind === "audioinput");
        const outputs = devices.filter(d => d.kind === "audiooutput");

        // Prefer external input over built-in/default when available.
        const defaultInput = await getPreferredAudioInput() || inputs.find(d => d.deviceId === "default") || inputs[0];
        const defaultOutput = await getDefaultAudioOutput() || outputs[0];

        const inputLabel = defaultInput?.label?.toLowerCase() || "";
        const outputLabel = defaultOutput?.label?.toLowerCase() || "";
        const sharesAudioHardware = hasSharedAudioHardware(inputLabel, outputLabel);
        const hasLoopbackRisk =
          sharesAudioHardware ||
          isLoopbackRiskInput(inputLabel) ||
          isPassthroughFeedbackRiskInput(inputLabel);

        // Detect headphones
        const isHeadphones =
          outputLabel.includes("headphone") ||
          outputLabel.includes("earphone") ||
          outputLabel.includes("headset") ||
          outputLabel.includes("airpod") ||
          outputLabel.includes("earbud");

        // Detect Bluetooth
        const isBluetooth =
          outputLabel.includes("bluetooth") ||
          outputLabel.includes("wireless") ||
          inputLabel.includes("bluetooth") ||
          inputLabel.includes("wireless");

        // Detect separate mic (input label clearly different from output)
        const inputName = inputLabel.replace(/\(.*\)/, "").trim();
        const outputName = outputLabel.replace(/\(.*\)/, "").trim();
        const isSeparateMic =
          inputName.length > 0 &&
          outputName.length > 0 &&
          !inputLabel.includes("built-in") &&
          !inputLabel.includes("internal") &&
          !hasLoopbackRisk &&
          inputName !== outputName;

        // Detect built-in risk
        const isBuiltinRisk =
          (inputLabel.includes("built-in") || inputLabel.includes("internal") || inputLabel === "") &&
          (outputLabel.includes("built-in") || outputLabel.includes("internal") || outputLabel.includes("speaker") || outputLabel === "");

        let setup: AudioSetup = "unknown";
        let warningNeeded = false;
        let message = "";

        if (hasLoopbackRisk) {
          setup = "builtin_risk";
          warningNeeded = true;
          message = "Warning: V8/shared audio device detected - mic monitoring is muted to prevent YouTube feedback";
        } else if (isHeadphones) {
          setup = "headphones";
          warningNeeded = false;
          message = "✅ Headphones detected — voice monitoring is safe to use";
        } else if (isBluetooth && isSeparateMic) {
          setup = "separate_mic";
          warningNeeded = false;
          message = "✅ Bluetooth speaker + separate mic — voice monitoring works great";
        } else if (isBluetooth) {
          setup = "bluetooth";
          warningNeeded = false;
          message = "✅ Bluetooth speaker detected — voice monitoring should work fine";
        } else if (isBuiltinRisk) {
          setup = "builtin_risk";
          warningNeeded = true;
          message = "⚠️ Built-in speaker detected — use headphones to avoid feedback squeal";
        } else if (isSeparateMic) {
          setup = "separate_mic";
          warningNeeded = false;
          message = "✅ Separate mic detected — voice monitoring is safe";
        } else {
          setup = "unknown";
          warningNeeded = true;
          message = "⚠️ Can't detect your setup — use headphones if possible to avoid feedback";
        }

        setInfo({
          setup,
          outputLabel: defaultOutput?.label || "Unknown",
          inputLabel: defaultInput?.label || "Unknown",
          warningNeeded,
          message,
        });
      } catch {
        // Permission denied or API not available
        setInfo({
          setup: "unknown",
          outputLabel: "",
          inputLabel: "",
          warningNeeded: true,
          message: "⚠️ Use headphones if your mic and speaker are the same device",
        });
      }
    }

    detect();
  }, []);

  return info;
}
