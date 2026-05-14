"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { csrfFetch } from "@/lib/csrf-client";

export interface AuthUser {
  userId: string;
  username: string;
  role: "user" | "admin";
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  onLogout: (cb: () => void) => () => void; // register a logout listener
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const logoutListeners = useState<Set<() => void>>(() => new Set())[0];

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user) setUser(d.user); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await csrfFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.user) { setUser(data.user); return {}; }
    return { error: data.error || "Login failed" };
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await csrfFetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (data.user) { setUser(data.user); return {}; }
    return { error: data.error || "Registration failed" };
  }, []);

  const logout = useCallback(async () => {
    await csrfFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    // Notify all logout listeners (e.g. QueueContext clears queue)
    logoutListeners.forEach(cb => cb());
  }, [logoutListeners]);

  // Register a callback to run on logout, returns unsubscribe fn
  const onLogout = useCallback((cb: () => void) => {
    logoutListeners.add(cb);
    return () => logoutListeners.delete(cb);
  }, [logoutListeners]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, onLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
