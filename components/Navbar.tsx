"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Music2, Search, Mic2, Heart, History, Trophy, Shield, LogIn, LogOut, User, Users, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Hide navbar on KTV and remote pages (they have their own UI)
  if (pathname.startsWith("/ktv") || pathname.startsWith("/remote")) return null;

  const links = [
    { href: "/", label: "Home", icon: Music2 },
    { href: "/search", label: "Search", icon: Search },
    { href: "/party", label: "Party KTV", icon: Users },
    { href: "/ranking", label: "Ranking Board", icon: Trophy },
    { href: "/favorites", label: "Favorites", icon: Heart },
    { href: "/history", label: "History", icon: History },
  ];

  return (
    <>
      <nav className="site-nav" style={{ background: "rgba(10,10,15,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mic2 size={20} color="white" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
              Kara<span style={{ color: "var(--accent-light)" }}>neko</span>
            </span>
          </Link>

          <div className="site-nav-desktop" style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              const isParty = href === "/party";
              return (
                <Link key={href} href={href} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 500, color: active ? "white" : isParty ? "#ffd700" : "var(--text-secondary)", background: active ? (isParty ? "#b45309" : "var(--accent)") : "transparent", transition: "all 0.15s ease" }}>
                  <Icon size={15} />
                  <span>{label}</span>
                </Link>
              );
            })}

            {user?.role === "admin" && (
              <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 500, color: pathname === "/admin" ? "white" : "#ffd700", background: pathname === "/admin" ? "var(--accent)" : "transparent" }}>
                <Shield size={15} />
              </Link>
            )}

            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }}>
                  <User size={14} color="var(--accent-light)" />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{user.username}</span>
                </div>
                <button onClick={logout} title="Sign out" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--text-secondary)" }}>
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8, padding: "8px 14px", background: "var(--accent)", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <LogIn size={14} /> Sign In
              </button>
            )}
          </div>

          <button
            className="site-nav-menu-button"
            onClick={() => setShowMenu(true)}
            aria-label="Open menu"
            style={{ width: 40, height: 40, display: "none", alignItems: "center", justifyContent: "center", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", cursor: "pointer" }}
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>
      <button
        className="site-nav-backdrop"
        data-open={showMenu ? "true" : "false"}
        aria-label="Close menu"
        onClick={() => setShowMenu(false)}
      />
      <aside className="site-nav-drawer" data-open={showMenu ? "true" : "false"}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <span style={{ fontSize: 18, fontWeight: 800 }}>
            Kara<span style={{ color: "var(--accent-light)" }}>neko</span>
          </span>
          <button onClick={() => setShowMenu(false)} aria-label="Close menu" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid var(--border)", background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            const isParty = href === "/party";
            return (
              <Link key={href} href={href} onClick={() => setShowMenu(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 700, color: active ? "white" : isParty ? "#ffd700" : "var(--text-secondary)", background: active ? (isParty ? "#b45309" : "var(--accent)") : "transparent" }}>
                <Icon size={17} />
                <span>{label}</span>
              </Link>
            );
          })}
          {user?.role === "admin" && (
            <Link href="/admin" onClick={() => setShowMenu(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 700, color: pathname === "/admin" ? "white" : "#ffd700", background: pathname === "/admin" ? "var(--accent)" : "transparent" }}>
              <Shield size={17} />
              Admin
            </Link>
          )}
        </div>
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 18, paddingTop: 18 }}>
          {user ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8 }}>
                <User size={15} color="var(--accent-light)" />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{user.username}</span>
              </div>
              <button onClick={() => { logout(); setShowMenu(false); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                <LogOut size={15} /> Sign out
              </button>
            </div>
          ) : (
            <button onClick={() => { setShowMenu(false); setShowAuth(true); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 12px", background: "var(--accent)", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              <LogIn size={15} /> Sign In
            </button>
          )}
        </div>
      </aside>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
