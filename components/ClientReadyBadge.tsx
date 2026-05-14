"use client";
import { useEffect, useState } from "react";

export default function ClientReadyBadge() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => setReady(true));
  }, []);

  if (process.env.NODE_ENV === "production" || !ready) return null;

  return (
    <div style={{ position: "fixed", left: 10, bottom: 10, zIndex: 9999, padding: "5px 8px", borderRadius: 6, background: "rgba(105,255,71,0.14)", border: "1px solid rgba(105,255,71,0.45)", color: "#69ff47", fontSize: 11, fontWeight: 700, pointerEvents: "none" }}>
      Client ready
    </div>
  );
}
