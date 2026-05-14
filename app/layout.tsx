import type { Metadata } from "next";
import "./globals.css";
import { QueueProvider } from "@/context/QueueContext";
import { AuthProvider } from "@/context/AuthContext";
import { RoomSettingsProvider } from "@/context/RoomSettingsContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Karaneko — Sing Your Heart Out",
  description: "Karaoke app with real-time voice scoring powered by YouTube",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <QueueProvider>
            <RoomSettingsProvider>
              <Navbar />
              {children}
            </RoomSettingsProvider>
          </QueueProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
