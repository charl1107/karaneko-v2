import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

/**
 * Hook to enable/disable audio monitoring (hearing yourself).
 * @param stream The MediaStream from the microphone.
 */
export function useVoiceMonitoring(stream: MediaStream | null) {
  const [isEnabled, setIsEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    // If monitoring is enabled and we have a stream, set up the audio graph
    if (isEnabled && stream) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const source = ctx.createMediaStreamSource(stream);

      // Connect the mic source directly to the speakers (destination)
      source.connect(ctx.destination);

      audioContextRef.current = ctx;
      sourceNodeRef.current = source;
    }

    // Cleanup function to stop monitoring when disabled or component unmounts
    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [isEnabled, stream]);

  return { isMonitoring: isEnabled, setIsMonitoring: setIsEnabled };
}
