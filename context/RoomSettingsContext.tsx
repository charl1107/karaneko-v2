"use client";
import { createContext, useContext, useState, ReactNode } from "react";

export interface RoomSettings {
  scoringEnabled: boolean;
  remoteDeleteEnabled: boolean;
  remoteReorderEnabled: boolean;
}

interface RoomSettingsContextType {
  settings: RoomSettings;
  updateSettings: (patch: Partial<RoomSettings>) => void;
}

const RoomSettingsContext = createContext<RoomSettingsContextType | null>(null);

export function RoomSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<RoomSettings>({
    scoringEnabled: true,
    remoteDeleteEnabled: true,
    remoteReorderEnabled: true,
  });

  const updateSettings = (patch: Partial<RoomSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  return (
    <RoomSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </RoomSettingsContext.Provider>
  );
}

export function useRoomSettings() {
  const ctx = useContext(RoomSettingsContext);
  if (!ctx) throw new Error("useRoomSettings must be used within RoomSettingsProvider");
  return ctx;
}
