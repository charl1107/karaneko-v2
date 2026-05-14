// lib/email.ts
// Resend API - works on Cloudflare Workers edge runtime

export async function sendVerificationEmail(
  to: string,
  username: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Karaneko <karaneko@resend.dev>";

  if (!apiKey) {
    console.error("RESEND_API_KEY not set");
    return { success: false, error: "Email service not configured" };
  }

  const html = `...`; // ← Keep your beautiful HTML template (no change needed)

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: `${code} — Your Karaneko verification code`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      const message = err.message || "Failed to send email";

      console.error("Resend API error:", message);

      if (message.includes("verify a domain") || message.includes("own email address")) {
        return {
          success: false,
          error: "Please set RESEND_FROM_EMAIL to 'Karaneko <karaneko@resend.dev>' in Cloudflare Pages secrets.",
        };
      }
      return { success: false, error: message };
    }

    return { success: true };
  } catch (err) {
    console.error("Email send error:", err);
    return { success: false, error: "Network error sending email" };
  }
}

export function generateVerificationCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, "0");
}
