"use client";

const BUILT_IN_INPUT_TERMS = [
  "built-in",
  "internal",
  "realtek",
  "high definition audio",
  "microphone array",
  "array",
];

const VIRTUAL_INPUT_TERMS = [
  "default",
  "communications",
];

const LOOPBACK_RISK_TERMS = [
  "stereo mix",
  "what u hear",
  "loopback",
  "monitor",
  "mix",
];

const SHARED_HARDWARE_ALIAS_TERMS = [
  "v8",
  "usb audio",
  "usb pnp",
  "usb pnp sound device",
];

const INPUT_PASSTHROUGH_RISK_TERMS = [
  "v8",
];

function normalizeLabel(label: string) {
  return label.toLowerCase().replace(/\s+/g, " ").trim();
}

function getHardwareToken(label: string) {
  const normalized = normalizeLabel(label);
  const parenthetical = normalized.match(/\(([^)]+)\)/)?.[1]?.trim();
  if (parenthetical) return parenthetical;

  return normalized
    .replace(/\b(default|communications|microphone|mic|speakers?|headphones?|headset|output|input)\b/g, "")
    .replace(/[^\w]+/g, " ")
    .trim();
}

function isExternalInput(device: MediaDeviceInfo) {
  const label = normalizeLabel(device.label);
  if (!label) return false;
  if (VIRTUAL_INPUT_TERMS.some((term) => label.includes(term))) return false;
  return !BUILT_IN_INPUT_TERMS.some((term) => label.includes(term));
}

export function hasSharedAudioHardware(inputLabel: string, outputLabel: string) {
  const normalizedInput = normalizeLabel(inputLabel);
  const normalizedOutput = normalizeLabel(outputLabel);
  const inputToken = getHardwareToken(inputLabel);
  const outputToken = getHardwareToken(outputLabel);
  if (inputToken && outputToken && inputToken === outputToken) return true;

  return SHARED_HARDWARE_ALIAS_TERMS.some(
    (term) => normalizedInput.includes(term) && normalizedOutput.includes(term)
  );
}

export function isLoopbackRiskInput(inputLabel: string) {
  const normalized = normalizeLabel(inputLabel);
  return LOOPBACK_RISK_TERMS.some((term) => normalized.includes(term));
}

export function isPassthroughFeedbackRiskInput(inputLabel: string) {
  const normalized = normalizeLabel(inputLabel);
  return INPUT_PASSTHROUGH_RISK_TERMS.some((term) => normalized.includes(term));
}

export async function getPreferredAudioInput() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter((device) => device.kind === "audioinput");
  const nonLoopbackInputs = inputs.filter((device) => !isLoopbackRiskInput(device.label));
  return (
    nonLoopbackInputs.find(isExternalInput) ||
    nonLoopbackInputs.find((device) => device.deviceId === "default") ||
    inputs.find(isExternalInput) ||
    inputs[0] ||
    null
  );
}

export async function getDefaultAudioOutput() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const outputs = devices.filter((device) => device.kind === "audiooutput");
  return outputs.find((device) => device.deviceId === "default") || outputs[0] || null;
}

export async function getPreferredAudioConstraints(base: MediaTrackConstraints = {}) {
  const preferredInput = await getPreferredAudioInput();
  if (!preferredInput || preferredInput.deviceId === "default") return base;
  return {
    ...base,
    deviceId: { exact: preferredInput.deviceId },
  };
}
