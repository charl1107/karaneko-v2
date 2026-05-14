"use client";
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Song, QueueItem } from "@/types";
import { useAuth } from "./AuthContext";

interface QueueContextType {
  queue: QueueItem[];
  currentSong: Song | null;
  addToQueue: (song: Song) => void;
  removeFromQueue: (queueId: string) => void;
  playSong: (song: Song) => void;
  playNext: () => Song | null;
  playQueueItem: (queueId: string) => Song | null;
  stopSong: () => void;
  clearQueue: () => void;
  favorites: Song[];
  toggleFavorite: (song: Song) => void;
  isFavorited: (id: string) => boolean;
  history: Song[];
}

const QueueContext = createContext<QueueContextType | null>(null);

export function QueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [history, setHistory] = useState<Song[]>([]);
  const { onLogout } = useAuth();

  // Clear queue and current song when user logs out
  useEffect(() => {
    const unsubscribe = onLogout(() => {
      setQueue([]);
      setCurrentSong(null);
      // Keep favorites and history — they're nice to have even after logout
      // but clear queue since it's session-based
    });
    return unsubscribe;
  }, [onLogout]);

  const addToQueue = useCallback((song: Song) => {
    setQueue((prev) => [...prev, { ...song, queueId: `${song.id}-${Date.now()}` }]);
  }, []);

  const removeFromQueue = useCallback((queueId: string) => {
    setQueue((prev) => prev.filter((s) => s.queueId !== queueId));
  }, []);

  const playSong = useCallback((song: Song) => {
    setCurrentSong(song);
    setHistory((prev) => [song, ...prev.filter((s) => s.id !== song.id)].slice(0, 50));
  }, []);

  const playNext = useCallback(() => {
    if (queue.length === 0) return null;
    const [next, ...rest] = queue;
    setCurrentSong(next);
    setQueue(rest);
    setHistory((prev) => [next, ...prev.filter((s) => s.id !== next.id)].slice(0, 50));
    return next;
  }, [queue]);

  const playQueueItem = useCallback((queueId: string) => {
    const next = queue.find((item) => item.queueId === queueId);
    if (!next) return null;
    setCurrentSong(next);
    setQueue((prev) => prev.filter((item) => item.queueId !== queueId));
    setHistory((prev) => [next, ...prev.filter((s) => s.id !== next.id)].slice(0, 50));
    return next;
  }, [queue]);

  const stopSong = useCallback(() => setCurrentSong(null), []);

  const clearQueue = useCallback(() => setQueue([]), []);

  const toggleFavorite = useCallback((song: Song) => {
    setFavorites((prev) =>
      prev.find((s) => s.id === song.id)
        ? prev.filter((s) => s.id !== song.id)
        : [song, ...prev]
    );
  }, []);

  const isFavorited = useCallback(
    (id: string) => favorites.some((s) => s.id === id),
    [favorites]
  );

  return (
    <QueueContext.Provider value={{
      queue, currentSong, addToQueue, removeFromQueue,
      playSong, playNext, playQueueItem, stopSong, clearQueue,
      favorites, toggleFavorite, isFavorited, history,
    }}>
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue() {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error("useQueue must be used within QueueProvider");
  return ctx;
}
