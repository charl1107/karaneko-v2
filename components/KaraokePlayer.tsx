"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Flame,
  ListMusic,
  Maximize2,
  Mic,
  Pause,
  Play,
  Plus,
  Search,
  SkipForward,
  Square,
  X,
} from "lucide-react";
import { ScoreResult, Song } from "@/types";
import { useMicPassthrough } from "@/hooks/useMicPassthrough";
import { useVoiceScoring } from "@/hooks/useVoiceScoring";
import { useRoomSettings } from "@/context/RoomSettingsContext";
import { useQueue } from "@/context/QueueContext";
import MicControls from "@/components/MicControls";
import { csrfFetch } from "@/lib/csrf-client";

interface KaraokePlayerProps {
  song: Song;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function closeAudioContext(ctx: AudioContext) {
  if (ctx.state === "closed") return;
  void ctx.close().catch(() => {});
}

const rankColors: Record<string, string> = {
  S: "var(--score-s)",
  A: "var(--score-a)",
  B: "var(--score-b)",
  C: "var(--score-c)",
  D: "var(--score-d)",
};

function playerUrl(song: Song) {
  return `/player?id=${song.youtubeId}&title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}&thumb=${encodeURIComponent(song.thumbnail)}`;
}

const YOUTUBE_PLAYER_ORIGIN = "https://www.youtube.com";

export default function KaraokePlayer({ song }: KaraokePlayerProps) {
  const router = useRouter();
  const { settings: roomSettings } = useRoomSettings();
  const { queue, currentSong, addToQueue, removeFromQueue, playSong, playNext, playQueueItem, stopSong } = useQueue();
  const mic = useMicPassthrough();
  const scoring = useVoiceScoring();
  const [sidebarTab, setSidebarTab] = useState<"popular" | "search" | "reserved">("popular");
  const [popularSongs, setPopularSongs] = useState<Song[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveStateKey, setSaveStateKey] = useState<string | null>(null);
  const [savedScoreKey, setSavedScoreKey] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [showScoreOverlay, setShowScoreOverlay] = useState(false);
  const [scoreOverlayClosing, setScoreOverlayClosing] = useState(false);
  const [showSongPanel, setShowSongPanel] = useState(false);
  const [showPlayerControls, setShowPlayerControls] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoStageRef = useRef<HTMLDivElement>(null);
  const autoStartedSongRef = useRef<string | null>(null);
  const scoreOverlayTimerRef = useRef<number | null>(null);
  const playerControlsTimerRef = useRef<number | null>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const playedScoreSoundKeyRef = useRef<string | null>(null);
  const completedSongRef = useRef<string | null>(null);
  const suppressNextScoreRef = useRef(false);

  const embedUrl = useMemo(() => {
    const params = new URLSearchParams({
      autoplay: "1",
      controls: "0",
      disablekb: "1",
      enablejsapi: "1",
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
    });
    return `https://www.youtube.com/embed/${song.youtubeId}?${params.toString()}`;
  }, [song.youtubeId]);

  const postToPlayer = useCallback((message: Record<string, unknown>) => {
    const playerWindow = iframeRef.current?.contentWindow;
    if (!playerWindow) return;

    try {
      playerWindow.postMessage(JSON.stringify(message), YOUTUBE_PLAYER_ORIGIN);
    } catch {
      // During Fast Refresh the iframe can briefly be about:blank with the app's
      // origin. The next load event will retry the YouTube player subscription.
    }
  }, []);

  const sendPlayerCommand = useCallback((func: "playVideo" | "pauseVideo" | "stopVideo") => {
    postToPlayer({ event: "command", func, args: [] });
  }, [postToPlayer]);

  const playScoreSound = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    const master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.knee.value = 18;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.18;
    limiter.connect(master);

    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + index * 0.095;
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.72, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
      osc.connect(gain);
      gain.connect(limiter);
      osc.start(start);
      osc.stop(start + 0.36);
    });

    [1046.5, 1318.51, 1567.98].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + 0.52 + index * 0.035;
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.28, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.42);
      osc.connect(gain);
      gain.connect(limiter);
      osc.start(start);
      osc.stop(start + 0.45);
    });

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.42, ctx.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) {
      channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / channel.length, 2.4);
    }
    const noise = ctx.createBufferSource();
    const noiseFilter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    noise.buffer = noiseBuffer;
    noiseFilter.type = "highpass";
    noiseFilter.frequency.value = 2400;
    noiseGain.gain.setValueAtTime(0.12, ctx.currentTime + 0.06);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.44);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(limiter);
    noise.start(ctx.currentTime + 0.06);
    noise.stop(ctx.currentTime + 0.48);

    window.setTimeout(() => closeAudioContext(ctx), 1400);
  };

  const dismissScoreOverlay = useCallback(() => {
    setScoreOverlayClosing(true);
    if (scoreOverlayTimerRef.current) window.clearTimeout(scoreOverlayTimerRef.current);
    scoreOverlayTimerRef.current = window.setTimeout(() => {
      setShowScoreOverlay(false);
      setScoreOverlayClosing(false);
      scoreOverlayTimerRef.current = null;
    }, 520);
  }, []);

  const submitSearch = async (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;

    setSidebarTab("search");
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&maxResults=8`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.songs || []);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const saveScore = useCallback(async (score: ScoreResult | null = scoring.finalScore, scoreSong: Song = song) => {
    if (!score) return;
    const nextSaveKey = `${scoreSong.youtubeId}:${score.total}:${score.rank}`;
    if (nextSaveKey === savedScoreKey || (nextSaveKey === saveStateKey && saveState === "saving")) return;
    setSaveStateKey(nextSaveKey);
    setSaveState("saving");

    try {
      const res = await csrfFetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtube_id: scoreSong.youtubeId,
          song_title: scoreSong.title,
          song_artist: scoreSong.artist,
          pitch_score: score.pitch,
          timing_score: score.timing,
          stability_score: score.stability,
          total_score: score.total,
          rank: score.rank,
        }),
      });

      setSaveState(res.ok ? "saved" : "error");
      if (res.ok) setSavedScoreKey(nextSaveKey);
    } catch {
      setSaveState("error");
    }
  }, [saveState, saveStateKey, savedScoreKey, scoring.finalScore, song]);

  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  const showFinalScore = useCallback((score: ScoreResult | null) => {
    if (!score) return;
    const scoreSoundKey = `${song.youtubeId}:${score.total}:${score.rank}`;
    setScoreOverlayClosing(false);
    setShowScoreOverlay(true);
    if (playedScoreSoundKeyRef.current !== scoreSoundKey) {
      playedScoreSoundKeyRef.current = scoreSoundKey;
      playScoreSound();
    }
  }, [song.youtubeId]);

  const finishCurrentScore = useCallback(async () => {
    if (!scoring.isListening) return false;
    const finalScore = scoring.stopListening();
    if (mic.isActive) mic.stop();
    showFinalScore(finalScore);
    await saveScore(finalScore, song);
    return Boolean(finalScore);
  }, [mic, saveScore, scoring, showFinalScore, song]);

  const discardCurrentScore = useCallback(() => {
    clearAutoAdvanceTimer();
    suppressNextScoreRef.current = true;
    if (scoring.isListening) scoring.stopListening();
    if (mic.isActive) mic.stop();
    setShowScoreOverlay(false);
    setScoreOverlayClosing(false);
  }, [clearAutoAdvanceTimer, mic, scoring]);

  const startQueueItem = async (queueId: string) => {
    const firstQueueItem = queue[0];
    if (firstQueueItem?.queueId !== queueId) return;
    discardCurrentScore();
    const next = playQueueItem(queueId);
    if (next) {
      setIsStopped(false);
      setIsPaused(false);
      router.replace(playerUrl(next));
    }
  };

  const reserveSong = (nextSong: Song) => {
    if (!currentSong || isStopped) {
      discardCurrentScore();
      playSong(nextSong);
      setIsStopped(false);
      setIsPaused(false);
      router.replace(playerUrl(nextSong));
      return;
    }

    addToQueue(nextSong);
  };

  const completeCurrentSong = useCallback(async () => {
    if (completedSongRef.current === song.youtubeId) return;
    completedSongRef.current = song.youtubeId;

    const showedScore = await finishCurrentScore();
    const advanceToNextSong = () => {
      const next = playNext();
      if (next) {
        setIsPaused(false);
        setIsStopped(false);
        router.replace(playerUrl(next));
      } else {
        stopSong();
        setIsPaused(false);
        setIsStopped(true);
      }
    };

    clearAutoAdvanceTimer();
    if (showedScore) {
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        autoAdvanceTimerRef.current = null;
        advanceToNextSong();
      }, 5600);
    } else {
      advanceToNextSong();
    }
  }, [clearAutoAdvanceTimer, finishCurrentScore, playNext, router, song.youtubeId, stopSong]);

  const handleNext = async () => {
    discardCurrentScore();
    const next = playNext();
    if (next) {
      setIsPaused(false);
      setIsStopped(false);
      router.replace(playerUrl(next));
    }
  };

  const handleStop = async () => {
    sendPlayerCommand("stopVideo");
    discardCurrentScore();
    setIsPaused(false);
    const next = playNext();
    if (next) {
      setIsStopped(false);
      router.replace(playerUrl(next));
    } else {
      stopSong();
      setIsStopped(true);
    }
  };

  const handlePauseToggle = () => {
    if (isPaused) {
      sendPlayerCommand("playVideo");
      setIsPaused(false);
    } else {
      sendPlayerCommand("pauseVideo");
      setIsPaused(true);
    }
  };

  const hidePlayerControls = useCallback(() => {
    if (playerControlsTimerRef.current) {
      window.clearTimeout(playerControlsTimerRef.current);
      playerControlsTimerRef.current = null;
    }
    setShowPlayerControls(false);
  }, []);

  const revealPlayerControls = useCallback(() => {
    setShowPlayerControls(true);
    if (playerControlsTimerRef.current) window.clearTimeout(playerControlsTimerRef.current);
    playerControlsTimerRef.current = window.setTimeout(() => {
      setShowPlayerControls(false);
      playerControlsTimerRef.current = null;
    }, 1500);
  }, []);

  const subscribeToPlayerEvents = useCallback(() => {
    postToPlayer({ event: "command", func: "addEventListener", args: ["onStateChange"] });
    postToPlayer({ event: "listening", id: "ktv-player" });
  }, [postToPlayer]);

  const handleFullscreen = async () => {
    const stage = videoStageRef.current;
    if (!stage) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await stage.requestFullscreen();
    }
  };

  const toggleScoring = async () => {
    if (scoring.isListening) {
      const finalScore = scoring.stopListening();
      if (mic.isActive) mic.stop();
      showFinalScore(finalScore);
      await saveScore(finalScore, song);
    } else {
      await scoring.startListening();
    }
  };

  const toggleMicEffects = async () => {
    if (mic.isActive || scoring.isListening) {
      discardCurrentScore();
    } else {
      await mic.toggle();
    }
  };

  useEffect(() => {
    let ignore = false;

    Promise.resolve().then(async () => {
      setLoadingPopular(true);
      try {
        const res = await fetch("/api/category?category=opm");
        const data = await res.json();
        if (!ignore) setPopularSongs(data.songs || []);
      } catch {
        if (!ignore) setPopularSongs([]);
      } finally {
        if (!ignore) setLoadingPopular(false);
      }
    });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!roomSettings.scoringEnabled) return;
    if (autoStartedSongRef.current === song.youtubeId) return;
    autoStartedSongRef.current = song.youtubeId;

    Promise.resolve().then(async () => {
      if (!scoring.isListening) await scoring.startListening();
    });
  }, [roomSettings.scoringEnabled, scoring, song.youtubeId]);

  useEffect(() => {
    completedSongRef.current = null;
    subscribeToPlayerEvents();
  }, [song.youtubeId, subscribeToPlayerEvents]);

  useEffect(() => {
    const handlePlayerMessage = (event: MessageEvent) => {
      if (event.origin !== YOUTUBE_PLAYER_ORIGIN) return;

      let data: unknown;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (!data || typeof data !== "object") return;
      const payload = data as { event?: string; info?: unknown };
      const playerState =
        payload.event === "onStateChange" && typeof payload.info === "number"
          ? payload.info
          : payload.event === "infoDelivery" &&
              payload.info &&
              typeof payload.info === "object" &&
              "playerState" in payload.info &&
              typeof payload.info.playerState === "number"
            ? payload.info.playerState
            : null;

      if (playerState === 0) void completeCurrentSong();
    };

    window.addEventListener("message", handlePlayerMessage);
    return () => window.removeEventListener("message", handlePlayerMessage);
  }, [completeCurrentSong]);

  useEffect(() => {
    if (!scoring.finalScore) return;
    if (suppressNextScoreRef.current) {
      suppressNextScoreRef.current = false;
      return;
    }
    Promise.resolve().then(() => {
      showFinalScore(scoring.finalScore);
      saveScore(scoring.finalScore, song);
    });
  }, [saveScore, scoring.finalScore, showFinalScore, song]);

  useEffect(() => {
    if (!showScoreOverlay) return;
    if (scoreOverlayTimerRef.current) window.clearTimeout(scoreOverlayTimerRef.current);
    scoreOverlayTimerRef.current = window.setTimeout(() => {
      dismissScoreOverlay();
    }, 5200);

    return () => {
      if (scoreOverlayTimerRef.current) window.clearTimeout(scoreOverlayTimerRef.current);
    };
  }, [dismissScoreOverlay, showScoreOverlay]);

  useEffect(() => {
    return () => {
      if (playerControlsTimerRef.current) window.clearTimeout(playerControlsTimerRef.current);
      if (autoAdvanceTimerRef.current) window.clearTimeout(autoAdvanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showPlayerControls) return;

    const hideWhenPointerMovesOutside = (event: PointerEvent) => {
      const stage = videoStageRef.current;
      if (stage && event.target instanceof Node && !stage.contains(event.target)) hidePlayerControls();
    };

    document.addEventListener("pointermove", hideWhenPointerMovesOutside);
    return () => document.removeEventListener("pointermove", hideWhenPointerMovesOutside);
  }, [hidePlayerControls, showPlayerControls]);

  const micNotice = getMicNotice({
    enabled: roomSettings.scoringEnabled,
    isListening: scoring.isListening,
    permissionStatus: mic.permissionStatus,
    micError: mic.error,
    scoringError: scoring.error,
  });
  const isAnyMicActive = mic.isActive || scoring.isListening;
  const displayedInputLevel = scoring.isListening ? Math.min(1, scoring.volume * 8) : mic.inputLevel;
  const songPanelState = showSongPanel ? "open" : "closed";

  return (
    <section className="ktv-player-shell" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 18, alignItems: "start" }}>
      <div className="ktv-player-main" style={{ display: "grid", gap: 14, minWidth: 0, width: "100%", maxWidth: "100%" }}>
        <div className="ktv-player-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 12, color: "var(--accent-light)", fontWeight: 800, marginBottom: 4 }}>Now singing</p>
            <h1 style={{ fontSize: "clamp(19px, 5vw, 26px)", fontWeight: 900, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {song.title}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {song.artist}
            </p>
          </div>

          <div className="ktv-top-controls" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              className="ktv-panel-toggle"
              onClick={() => setShowSongPanel(true)}
              title="Songs"
              style={controlButton("var(--bg-card)", true)}
            >
              <ListMusic size={16} />
            </button>
            <button onClick={handlePauseToggle} title={isPaused ? "Resume song" : "Pause song"} style={controlButton("var(--bg-card)", true)}>
              {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
            </button>
            <button onClick={handleFullscreen} title="Fullscreen" style={controlButton("var(--bg-card)", true)}>
              <Maximize2 size={16} />
            </button>
            <button onClick={handleNext} disabled={queue.length === 0} title="Next song" style={controlButton(queue.length > 0 ? "var(--accent)" : "var(--bg-card)", queue.length > 0)}>
              <SkipForward size={17} />
            </button>
            <button onClick={handleStop} title="Stop session" style={controlButton("#ef4444", true)}>
              <Square size={15} fill="currentColor" />
            </button>
          </div>
        </div>

        {micNotice && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 14px",
            background: "rgba(255,152,0,0.1)",
            border: "1px solid rgba(255,152,0,0.28)",
            borderRadius: 8,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
              <AlertTriangle size={18} color="#ff9800" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: "#ffb020", marginBottom: 2 }}>
                  {micNotice.title}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 }}>
                  {micNotice.detail}
                </p>
              </div>
            </div>
            {micNotice.action && (
              <button onClick={toggleScoring} style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                flexShrink: 0,
                padding: "8px 11px",
                borderRadius: 8,
                border: "none",
                background: "var(--accent)",
                color: "white",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}>
                <Mic size={14} />
                Start Mic
              </button>
            )}
          </div>
        )}

        <div
          ref={videoStageRef}
          className="ktv-video-stage"
          data-controls-visible={showPlayerControls ? "true" : "false"}
          onMouseMove={revealPlayerControls}
          onMouseLeave={hidePlayerControls}
          onPointerMove={revealPlayerControls}
          onPointerLeave={hidePlayerControls}
          onPointerCancel={hidePlayerControls}
          onFocusCapture={revealPlayerControls}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) hidePlayerControls();
          }}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "100%",
            aspectRatio: "16 / 9",
            background: "#050507",
            border: "1px solid var(--border)",
            borderRadius: 8,
            overflow: "hidden",
          }}>
          <iframe
            ref={iframeRef}
            key={song.youtubeId}
            title={`${song.title} karaoke video`}
            src={embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={subscribeToPlayerEvents}
            style={{ width: "100%", height: "100%", border: 0, display: "block", pointerEvents: "none" }}
          />
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(180deg, rgba(0,0,0,0.18), transparent 35%, transparent 65%, rgba(0,0,0,0.38))",
            pointerEvents: "auto",
          }}>
            <div style={{ position: "absolute", top: 14, left: 16, right: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 900, color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {song.title}
                </p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.78)", textShadow: "0 2px 8px rgba(0,0,0,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {song.artist}
                </p>
              </div>
              <span style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 9px",
                borderRadius: 999,
                background: scoring.isListening ? "rgba(34,197,94,0.16)" : "rgba(255,152,0,0.16)",
                border: `1px solid ${scoring.isListening ? "rgba(34,197,94,0.45)" : "rgba(255,152,0,0.45)"}`,
                color: scoring.isListening ? "#69ff47" : "#ffb020",
                fontSize: 12,
                fontWeight: 800,
                flexShrink: 0,
              }}>
                <Mic size={13} />
                {scoring.isListening ? "Mic On" : "Mic Notice"}
              </span>
            </div>

            <div className="ktv-player-hover-controls" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button onClick={handlePauseToggle} title={isPaused ? "Resume song" : "Pause song"} style={overlayButton(isPaused ? "rgba(34,197,94,0.92)" : "rgba(0,0,0,0.62)")}>
                {isPaused ? <Play size={30} fill="currentColor" /> : <Pause size={30} fill="currentColor" />}
              </button>
              <button onClick={handleNext} disabled={queue.length === 0} title="Next song" style={overlayButton(queue.length > 0 ? "rgba(59,130,246,0.94)" : "rgba(50,50,60,0.72)")}>
                <SkipForward size={30} />
              </button>
              <button onClick={handleStop} title="Stop song" style={overlayButton("rgba(239,68,68,0.94)")}>
                <Square size={26} fill="currentColor" />
              </button>
              <button onClick={handleFullscreen} title="Fullscreen" style={overlayButton("rgba(59,130,246,0.94)")}>
                <Maximize2 size={28} />
              </button>
            </div>

          </div>
          {showScoreOverlay && scoring.finalScore && (
            <div className={`ktv-score-overlay ${scoreOverlayClosing ? "is-closing" : ""}`} style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.68)",
              backdropFilter: "blur(1px)",
              zIndex: 2,
            }}>
              <div className="ktv-confetti" aria-hidden="true">
                {Array.from({ length: 18 }).map((_, index) => (
                  <span key={index} style={{
                    left: `${8 + (index * 5.1) % 86}%`,
                    animationDelay: `${index * 0.08}s`,
                    background: index % 3 === 0 ? "#ffd700" : index % 3 === 1 ? "#60a5fa" : "#69ff47",
                  }} />
                ))}
              </div>
              <button
                onClick={dismissScoreOverlay}
                aria-label="Close score overlay"
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(0,0,0,0.45)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
              <div className="ktv-score-card" style={{ textAlign: "center", padding: 24 }}>
                <p style={{
                  color: "white",
                  fontSize: 26,
                  fontWeight: 900,
                  letterSpacing: 2,
                  textShadow: "0 0 18px rgba(147,197,253,0.9)",
                  marginBottom: 12,
                }}>
                  YOUR SCORE
                </p>
                <p style={{
                  color: rankColors[scoring.finalScore.rank],
                  fontSize: "clamp(72px, 12vw, 138px)",
                  lineHeight: 0.9,
                  fontWeight: 1000,
                  textShadow: `0 0 34px ${rankColors[scoring.finalScore.rank]}`,
                  marginBottom: 14,
                }}>
                  {scoring.finalScore.total}
                </p>
                <p style={{
                  color: rankColors[scoring.finalScore.rank],
                  fontSize: 28,
                  fontWeight: 900,
                  textShadow: `0 0 24px ${rankColors[scoring.finalScore.rank]}`,
                }}>
                  Rank {scoring.finalScore.rank}
                </p>
              </div>
            </div>
          )}
          {isStopped && (
            <div className="ktv-waiting-overlay" style={{
              position: "absolute",
              inset: 0,
              zIndex: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              background: "linear-gradient(180deg, rgba(5,5,7,0.78), rgba(5,5,7,0.94))",
              textAlign: "center",
            }}>
              <div className="ktv-waiting-grid" aria-hidden="true" />
              <div className="ktv-waiting-pulse" aria-hidden="true" />
              <div style={{ maxWidth: 420 }}>
                <p style={{ color: "var(--accent-light)", fontSize: 12, fontWeight: 900, marginBottom: 8, textTransform: "uppercase" }}>
                  Session stopped
                </p>
                <h2 style={{ color: "white", fontSize: "clamp(24px, 4vw, 38px)", lineHeight: 1.05, fontWeight: 1000, marginBottom: 10 }}>
                  Waiting to sing again
                </h2>
                <div className="ktv-waiting-bars" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, lineHeight: 1.5, marginBottom: 18 }}>
                  Pick another song from the list, or head home when you are done.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={() => router.replace("/")}
                    style={playerBarButton("rgba(255,255,255,0.08)", "rgba(255,255,255,0.86)")}
                  >
                    Home
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ktv-player-bar" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginTop: -6,
          padding: "0 4px",
        }}>
          <div className="ktv-player-bar-actions" style={{ display: "flex", gap: 8 }}>
            <button onClick={handlePauseToggle} title={isPaused ? "Resume song" : "Pause song"} style={playerBarButton(isPaused ? "rgba(34,197,94,0.18)" : "rgba(124,58,237,0.18)", isPaused ? "#69ff47" : "var(--accent-light)")}>
              {isPaused ? <Play size={15} fill="currentColor" /> : <Pause size={15} fill="currentColor" />}
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button onClick={handleStop} title="Stop song" style={playerBarButton("rgba(239,68,68,0.16)", "#f87171")}>
              <Square size={13} fill="currentColor" />
              Stop
            </button>
            <button onClick={handleFullscreen} title="Fullscreen" style={playerBarButton("rgba(59,130,246,0.16)", "#60a5fa")}>
              <Maximize2 size={15} />
              Fullscreen
            </button>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 11 }}>
            YouTube seeking is locked. Use KTV controls.
          </p>
        </div>

        {roomSettings.scoringEnabled && scoring.error && (
          <p style={{ color: "#f87171", fontSize: 13, lineHeight: 1.5 }}>{scoring.error}</p>
        )}

        <MicControls
          settings={mic.settings}
          onUpdate={mic.updateSettings}
          isActive={isAnyMicActive}
          permissionStatus={mic.permissionStatus}
          inputLevel={displayedInputLevel}
          onToggle={toggleMicEffects}
        />
        {mic.error && <p style={{ color: "#f87171", fontSize: 13, lineHeight: 1.5 }}>{mic.error}</p>}
      </div>

      <button
        className="ktv-panel-backdrop"
        data-state={songPanelState}
        aria-label="Close songs panel"
        onClick={() => setShowSongPanel(false)}
      />
      <aside className="ktv-song-panel" style={{
        position: "sticky",
        top: 82,
        maxHeight: "calc(100vh - 100px)",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 14,
        minHeight: 0,
      }} data-state={songPanelState}>
        <div className="ktv-panel-drawer-header">
          <div>
            <p style={{ fontSize: 14, fontWeight: 900, color: "white" }}>Songs</p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{queue.length} reserved</p>
          </div>
          <button
            onClick={() => setShowSongPanel(false)}
            aria-label="Close songs panel"
            style={sidebarIconButton("var(--text-secondary)")}
          >
            <X size={15} />
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 4, marginBottom: 14 }}>
          <SidebarTabButton active={sidebarTab === "popular"} onClick={() => setSidebarTab("popular")}>
            <Flame size={14} />
            Popular
          </SidebarTabButton>
          <SidebarTabButton active={sidebarTab === "search"} onClick={() => setSidebarTab("search")}>
            <Search size={14} />
            Search
          </SidebarTabButton>
          <SidebarTabButton active={sidebarTab === "reserved"} onClick={() => setSidebarTab("reserved")}>
            <ListMusic size={14} />
            <span>Reserved</span>
            <span style={{ minWidth: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999, background: "rgba(255,255,255,0.16)", color: "white", fontSize: 11, fontWeight: 900 }}>
              {queue.length}
            </span>
          </SidebarTabButton>
        </div>

        {sidebarTab === "search" && (
          <form onSubmit={submitSearch} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search karaoke..."
              style={{
                flex: 1,
                minWidth: 0,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text-primary)",
                padding: "10px 11px",
                outline: "none",
                fontSize: 13,
              }}
            />
            <button type="submit" disabled={searching} title="Search" style={controlButton("var(--accent)", !searching)}>
              <Search size={16} />
            </button>
          </form>
        )}
        {searchError && sidebarTab === "search" && <p style={{ color: "#f87171", fontSize: 12, marginBottom: 10 }}>{searchError}</p>}

        <div style={{ overflowY: "auto", minHeight: 0, paddingRight: 4 }}>
          {sidebarTab === "popular" && loadingPopular && <p style={{ color: "var(--text-secondary)", fontSize: 13, padding: "12px 4px" }}>Loading popular songs...</p>}
          {sidebarTab === "popular" && !loadingPopular && popularSongs.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "12px 4px" }}>No popular songs found.</p>}
          {sidebarTab === "popular" && popularSongs.map((popularSong) => (
            <SidebarSongRow
              key={popularSong.id}
              song={popularSong}
              actionLabel="Reserve"
              onAction={() => reserveSong(popularSong)}
            />
          ))}

          {sidebarTab === "search" && searching && <p style={{ color: "var(--text-secondary)", fontSize: 13, padding: "12px 4px" }}>Searching...</p>}
          {sidebarTab === "search" && !searching && results.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "12px 4px" }}>Search for a song to add it here.</p>}
          {sidebarTab === "search" && !searching && results.map((result) => (
            <SidebarSongRow
              key={result.id}
              song={result}
              actionLabel="Reserve"
              onAction={() => reserveSong(result)}
            />
          ))}

          {sidebarTab === "reserved" && queue.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "12px 4px" }}>Reserved list is empty.</p>}
          {sidebarTab === "reserved" && queue.map((item, index) => (
            <SidebarSongRow
              key={item.queueId}
              song={item}
              actionLabel={index === 0 ? "Play" : "Queued"}
              onAction={() => startQueueItem(item.queueId)}
              actionDisabled={index !== 0}
              secondaryLabel="Remove"
              onSecondary={() => removeFromQueue(item.queueId)}
            />
          ))}
        </div>
      </aside>

      <style>{`
        .ktv-player-hover-controls {
          opacity: 0;
          transform: translateY(8px) scale(0.98);
          transition: opacity 0.16s ease, transform 0.16s ease;
          pointer-events: none;
        }
        .ktv-video-stage[data-controls-visible="true"] .ktv-player-hover-controls {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .ktv-player-bar-actions {
          min-width: 0;
          flex-wrap: wrap;
        }
        .ktv-player-main > * {
          min-width: 0;
          max-width: 100%;
        }
        .ktv-score-overlay {
          animation: score-overlay-in 0.28s ease both;
        }
        .ktv-score-overlay.is-closing {
          animation: score-overlay-out 0.52s ease both;
        }
        .ktv-score-card {
          position: relative;
          z-index: 1;
          animation: score-card-pop 0.62s cubic-bezier(0.18, 0.9, 0.24, 1.2) both;
        }
        .ktv-score-overlay.is-closing .ktv-score-card {
          animation: score-card-out 0.48s ease both;
        }
        .ktv-confetti {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .ktv-confetti span {
          position: absolute;
          top: -18px;
          width: 8px;
          height: 14px;
          border-radius: 2px;
          opacity: 0;
          animation: confetti-fall 1.9s ease-out forwards;
        }
        .ktv-waiting-overlay {
          overflow: hidden;
        }
        .ktv-waiting-overlay > div:not(.ktv-waiting-grid):not(.ktv-waiting-pulse) {
          position: relative;
          z-index: 1;
        }
        .ktv-waiting-grid {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(180deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 56px 56px;
          opacity: 0.18;
          animation: waiting-grid-drift 9s linear infinite;
        }
        .ktv-waiting-pulse {
          position: absolute;
          width: 44%;
          aspect-ratio: 1;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(124,58,237,0.32), transparent 68%);
          animation: waiting-pulse 2.6s ease-in-out infinite;
        }
        .ktv-waiting-bars {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          gap: 5px;
          height: 24px;
          margin-bottom: 12px;
        }
        .ktv-waiting-bars span {
          width: 6px;
          height: 9px;
          border-radius: 999px;
          background: var(--accent-light);
          box-shadow: 0 0 16px rgba(168,85,247,0.65);
          animation: waiting-bar 0.86s ease-in-out infinite;
        }
        .ktv-waiting-bars span:nth-child(2) { animation-delay: 0.12s; }
        .ktv-waiting-bars span:nth-child(3) { animation-delay: 0.24s; }
        .ktv-waiting-bars span:nth-child(4) { animation-delay: 0.36s; }
        @keyframes score-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes score-overlay-out {
          to { opacity: 0; backdrop-filter: blur(0); }
        }
        @keyframes score-card-pop {
          0% { opacity: 0; transform: translateY(18px) scale(0.86); }
          62% { opacity: 1; transform: translateY(0) scale(1.06); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes score-card-out {
          to { opacity: 0; transform: translateY(-14px) scale(0.94); }
        }
        @keyframes confetti-fall {
          0% { opacity: 0; transform: translateY(-20px) rotate(0deg); }
          12% { opacity: 1; }
          100% { opacity: 0; transform: translateY(280px) rotate(390deg); }
        }
        @keyframes waiting-grid-drift {
          from { background-position: 0 0, 0 0; }
          to { background-position: 56px 56px, 56px 56px; }
        }
        @keyframes waiting-pulse {
          0%, 100% { opacity: 0.42; transform: scale(0.82); }
          50% { opacity: 0.78; transform: scale(1); }
        }
        @keyframes waiting-bar {
          0%, 100% { height: 8px; opacity: 0.45; }
          50% { height: 24px; opacity: 1; }
        }
        .ktv-panel-toggle,
        .ktv-panel-drawer-header,
        .ktv-panel-backdrop {
          display: none !important;
        }
        .ktv-panel-backdrop {
          border: none;
          padding: 0;
        }
        .ktv-song-panel {
          min-width: 0;
          width: 360px;
          justify-self: stretch;
        }
        @media (max-width: 1180px) {
          .ktv-player-shell {
            grid-template-columns: 1fr !important;
          }
          .ktv-panel-toggle {
            display: flex !important;
          }
          .ktv-panel-drawer-header {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 12px;
          }
          .ktv-panel-backdrop[data-state="open"] {
            position: fixed;
            inset: 0;
            z-index: 70;
            display: block !important;
            background: rgba(0, 0, 0, 0.55);
            cursor: pointer;
          }
          .ktv-player-shell .ktv-song-panel {
            position: fixed !important;
            top: 0 !important;
            right: 0;
            bottom: 0;
            z-index: 80;
            width: min(390px, calc(100vw - 24px));
            height: 100vh;
            max-height: 100vh !important;
            border-radius: 0;
            border-top: none;
            border-right: none;
            border-bottom: none;
            box-shadow: -18px 0 42px rgba(0, 0, 0, 0.38);
            transform: translateX(calc(100% + 24px));
            transition: transform 0.18s ease;
          }
          .ktv-player-shell .ktv-song-panel[data-state="open"] {
            transform: translateX(0);
          }
          .ktv-player-shell .ktv-song-panel[data-state="closed"] {
            pointer-events: none;
          }
        }
        @media (max-width: 640px) {
          .ktv-player-shell .ktv-song-panel {
            width: 100vw;
            max-width: 100vw;
            padding: 14px;
          }
          .ktv-player-bar {
            align-items: flex-start !important;
            flex-direction: column !important;
          }
          .ktv-top-controls {
            flex-wrap: wrap;
            justify-content: flex-end;
          }
        }
      `}</style>
    </section>
  );
}

function SidebarTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        minWidth: 0,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: 10,
        border: active ? "1px solid #38a3ff" : "1px solid transparent",
        background: active ? "rgba(56,163,255,0.12)" : "transparent",
        color: active ? "white" : "var(--text-secondary)",
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
        boxShadow: active ? "0 0 0 1px rgba(56,163,255,0.16), inset 0 0 18px rgba(56,163,255,0.08)" : "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function SidebarSongRow({
  song,
  actionLabel,
  onAction,
  actionDisabled = false,
  secondaryLabel,
  onSecondary,
}: {
  song: Song;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 4px",
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 900, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
          {song.title}
        </p>
        <p style={{ fontSize: 11, color: "#9fb0d6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {song.artist}
        </p>
      </div>
      <button onClick={onAction} disabled={actionDisabled} title={actionLabel} style={sidebarPlayButton(!actionDisabled)}>
        <Play size={12} fill="currentColor" />
        {actionLabel}
      </button>
      {onSecondary && secondaryLabel && (
        <button onClick={onSecondary} title={secondaryLabel} style={sidebarIconButton(secondaryLabel === "Remove" ? "#f87171" : "var(--accent-light)")}>
          {secondaryLabel === "Remove" ? <X size={13} /> : <Plus size={13} />}
        </button>
      )}
    </div>
  );
}

function sidebarPlayButton(enabled = true): React.CSSProperties {
  return {
    height: 27,
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "0 8px",
    borderRadius: 6,
    border: enabled ? "1px solid #38a3ff" : "1px solid var(--border)",
    background: enabled ? "rgba(56,163,255,0.08)" : "rgba(255,255,255,0.035)",
    color: enabled ? "#38a3ff" : "var(--text-muted)",
    fontSize: 12,
    fontWeight: 900,
    cursor: enabled ? "pointer" : "default",
    flexShrink: 0,
  };
}

function sidebarIconButton(color: string): React.CSSProperties {
  return {
    width: 27,
    height: 27,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    border: "1px solid var(--border)",
    background: "rgba(255,255,255,0.04)",
    color,
    cursor: "pointer",
    flexShrink: 0,
  };
}

function playerBarButton(background: string, color: string): React.CSSProperties {
  return {
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "0 11px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background,
    color,
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  };
}

function controlButton(background: string, enabled: boolean): React.CSSProperties {
  return {
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: "none",
    background,
    color: enabled ? "white" : "var(--text-muted)",
    cursor: enabled ? "pointer" : "default",
  };
}

function overlayButton(background: string): React.CSSProperties {
  const disabled = background.includes("50,50,60");
  return {
    width: 58,
    height: 58,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.72)",
    background,
    color: "white",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.72 : 1,
    boxShadow: "0 10px 28px rgba(0,0,0,0.45)",
  };
}

function getMicNotice({
  enabled,
  isListening,
  permissionStatus,
  micError,
  scoringError,
}: {
  enabled: boolean;
  isListening: boolean;
  permissionStatus: string;
  micError: string | null;
  scoringError: string | null;
}) {
  if (!enabled) return null;

  if (permissionStatus === "denied") {
    return {
      tone: "warning" as const,
      title: "Microphone is blocked",
      detail: micError || scoringError || "Allow microphone access in the browser site settings, then press Start Mic.",
      action: true,
    };
  }

  if (permissionStatus === "unsupported") {
    return {
      tone: "warning" as const,
      title: "Microphone is unavailable",
      detail: micError || "Use HTTPS, localhost, or a browser with microphone support.",
      action: false,
    };
  }

  if (!isListening) {
    return {
      tone: "warning" as const,
      title: "Automatic scoring is not listening yet",
      detail: scoringError || micError || "Browser permissions may require one click before scoring can start.",
      action: true,
    };
  }

  return null;
}
