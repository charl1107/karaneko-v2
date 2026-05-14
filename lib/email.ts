// lib/email.ts
// Resend API - Works on Cloudflare Workers edge runtime

export async function sendVerificationEmail(
  to: string,
  username: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  
  const apiKey = process.env.RESEND_API_KEY;
  
  // Recommended for users without custom domain
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Karaneko <karaneko@resend.dev>";

  if (!apiKey) {
    console.error("RESEND_API_KEY is not set");
    return { success: false, error: "Email service not configured" };
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#1a1a26;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3);">
   
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">🎤</div>
      <h1 style="color:white;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Karaneko</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Sing Your Heart Out</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="color:#e0e0f0;font-size:16px;margin:0 0 8px;">Hey <strong>${username}</strong> 👋</p>
      <p style="color:#9090b0;font-size:14px;margin:0 0 28px;line-height:1.6;">
        Welcome to Karaneko! Use the verification code below to activate your account.
        This code expires in <strong style="color:#a855f7;">15 minutes</strong>.
      </p>

      <!-- Code box -->
      <div style="background:#0a0a14;border:2px solid rgba(124,58,237,0.5);border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
        <p style="color:#9090b0;font-size:12px;margin:0 0 12px;text-transform:uppercase;letter-spacing:2px;">Verification Code</p>
        <div style="font-size:44px;font-weight:900;letter-spacing:12px;color:#a855f7;font-family:monospace;">${code}</div>
      </div>

      <p style="color:#606080;font-size:12px;margin:0;line-height:1.6;">
        If you didn't create an account on Karaneko, you can safely ignore this email.
        <br>This code is valid for one use only.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="color:#404060;font-size:11px;margin:0;">© Karaneko • Sing Your Heart Out</p>
    </div>
  </div>
</body>
</html>`;

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

      // Helpful message for sandbox users
      if (message.includes("verify a domain") || message.includes("own email address")) {
        return {
          success: false,
          error: "Resend requires a verified domain or using @resend.dev address. Make sure RESEND_FROM_EMAIL is set to 'Karaneko <karaneko@resend.dev>'",
        };
      }

      return { success: false, error: message };
    }

    return { success: true };
  } catch (err) {
    console.error("Email send error:", err);
    return { success: false, error: "Failed to send verification email" };
  }
}

// Generate 6-digit verification code
export function generateVerificationCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, "0");
}
