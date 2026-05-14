"use client";
import { useState, useRef, useEffect } from "react";
import { X, Mic2, User, Lock, Mail, Eye, EyeOff, ArrowLeft, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { csrfFetch } from "@/lib/csrf-client";

interface AuthModalProps { onClose: () => void }

type Step = "login" | "register" | "verify";

export default function AuthModal({ onClose }: AuthModalProps) {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const inputStyle = {
    width: "100%",
    padding: "11px 14px 11px 40px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text-primary)",
    fontSize: 14,
    outline: "none",
  };

  const iconStyle = {
    position: "absolute" as const,
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-muted)",
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.error) setError(result.error);
    else onClose();
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await csrfFetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    if (data.pending) {
      setPendingEmail(data.email);
      setStep("verify");
      setResendCooldown(60);
    }
  };

  const handleCodeChange = (idx: number, val: string) => {
    // Allow paste of full 6-digit code
    if (val.length === 6 && /^\d{6}$/.test(val)) {
      const digits = val.split("");
      setCode(digits);
      codeRefs.current[5]?.focus();
      return;
    }
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[idx] = val;
    setCode(next);
    if (val && idx < 5) codeRefs.current[idx + 1]?.focus();
  };

  const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      codeRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) { setError("Enter the full 6-digit code"); return; }
    setError(""); setLoading(true);

    const res = await csrfFetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingEmail, code: fullCode }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.error) { setError(data.error); return; }
    if (data.user) {
      // Refresh auth state
      window.location.reload();
      onClose();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true); setError("");
    const res = await csrfFetch("/api/auth/resend-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingEmail }),
    });
    const data = await res.json();
    setResending(false);
    if (data.error) setError(data.error);
    else { setCode(["","","","","",""]); setResendCooldown(60); }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-accent)", borderRadius: 16, padding: 32, width: "100%", maxWidth: 400, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
          <X size={20} />
        </button>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Mic2 size={24} color="white" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>
            {step === "verify" ? "Check your email" : step === "login" ? "Welcome back" : "Join Karaneko"}
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
            {step === "verify"
              ? `We sent a 6-digit code to ${pendingEmail}`
              : step === "login"
              ? "Sign in to save your scores"
              : "Create an account to start scoring"}
          </p>
        </div>

        {/* ── VERIFY STEP ── */}
        {step === "verify" && (
          <div>
            {/* Back button */}
            <button onClick={() => { setStep("register"); setCode(["","","","","",""]); setError(""); }}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", marginBottom: 20 }}>
              <ArrowLeft size={14} /> Back to register
            </button>

            {/* 6-digit code inputs */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
              {code.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => { codeRefs.current[idx] = el; }}
                  value={digit}
                  onChange={e => handleCodeChange(idx, e.target.value)}
                  onKeyDown={e => handleCodeKeyDown(idx, e)}
                  maxLength={6}
                  inputMode="numeric"
                  style={{
                    width: 46,
                    height: 54,
                    textAlign: "center",
                    fontSize: 24,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    background: "var(--bg-secondary)",
                    border: `2px solid ${digit ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 10,
                    color: "var(--text-primary)",
                    outline: "none",
                    transition: "border-color 0.15s ease",
                  }}
                />
              ))}
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.1)", borderRadius: 6, marginBottom: 12 }}>
                {error}
              </p>
            )}

            <button
              onClick={handleVerify}
              disabled={loading || code.join("").length !== 6}
              style={{ width: "100%", padding: "12px 0", background: code.join("").length === 6 ? "var(--accent)" : "var(--text-muted)", border: "none", borderRadius: 8, color: "white", fontSize: 15, fontWeight: 700, cursor: code.join("").length === 6 ? "pointer" : "not-allowed", marginBottom: 14 }}
            >
              {loading ? "Verifying..." : "Verify Account"}
            </button>

            {/* Resend */}
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
                Didn&apos;t receive the code?
              </p>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || resending}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: resendCooldown > 0 ? "var(--text-muted)" : "var(--accent-light)", fontSize: 13, fontWeight: 600, cursor: resendCooldown > 0 ? "not-allowed" : "pointer" }}
              >
                <RefreshCw size={13} />
                {resending ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {/* ── LOGIN / REGISTER STEPS ── */}
        {step !== "verify" && (
          <>
            {/* Tabs */}
            <div style={{ display: "flex", background: "var(--bg-secondary)", borderRadius: 8, padding: 4, marginBottom: 24 }}>
              {(["login", "register"] as const).map((m) => (
                <button key={m} onClick={() => { setStep(m); setError(""); }}
                  style={{ flex: 1, padding: "8px 0", background: step === m ? "var(--accent)" : "transparent", border: "none", borderRadius: 6, color: step === m ? "white" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease", textTransform: "capitalize" }}>
                  {m === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>

            <form onSubmit={step === "login" ? handleLoginSubmit : handleRegisterSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Username */}
              <div style={{ position: "relative" }}>
                <User size={16} style={iconStyle} />
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required style={inputStyle} />
              </div>

              {/* Email (register only) */}
              {step === "register" && (
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={iconStyle} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required style={inputStyle} />
                </div>
              )}

              {/* Password */}
              <div style={{ position: "relative" }}>
                <Lock size={16} style={iconStyle} />
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required style={{ ...inputStyle, paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && (
                <p style={{ fontSize: 13, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.1)", borderRadius: 6 }}>
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} style={{ padding: "12px 0", background: loading ? "var(--text-muted)" : "var(--accent)", border: "none", borderRadius: 8, color: "white", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}>
                {loading ? "Please wait..." : step === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
