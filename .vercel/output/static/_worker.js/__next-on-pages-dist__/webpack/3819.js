var a={},f=(p,g,m)=>(a.__chunk_3819=(x,i,n)=>{"use strict";async function s(e,l,o){let r=process.env.RESEND_API_KEY;if(!r)return console.error("RESEND_API_KEY not set"),{success:!1,error:"Email service not configured"};let c=`
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
      <div style="font-size:32px;margin-bottom:8px;">\u{1F3A4}</div>
      <h1 style="color:white;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Karaneko</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Sing Your Heart Out</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="color:#e0e0f0;font-size:16px;margin:0 0 8px;">Hey <strong>${l}</strong> \u{1F44B}</p>
      <p style="color:#9090b0;font-size:14px;margin:0 0 28px;line-height:1.6;">
        Welcome to Karaneko! Use the verification code below to activate your account.
        This code expires in <strong style="color:#a855f7;">15 minutes</strong>.
      </p>

      <!-- Code box -->
      <div style="background:#0a0a14;border:2px solid rgba(124,58,237,0.5);border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
        <p style="color:#9090b0;font-size:12px;margin:0 0 12px;text-transform:uppercase;letter-spacing:2px;">Verification Code</p>
        <div style="font-size:44px;font-weight:900;letter-spacing:12px;color:#a855f7;font-family:monospace;">${o}</div>
      </div>

      <p style="color:#606080;font-size:12px;margin:0;line-height:1.6;">
        If you didn't create an account on Karaneko, you can safely ignore this email.
        <br>This code is valid for one use only.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="color:#404060;font-size:11px;margin:0;">\xA9 Karaneko \xB7 Sing Your Heart Out</p>
    </div>
  </div>
</body>
</html>`;try{let t=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${r}`,"Content-Type":"application/json"},body:JSON.stringify({from:"Karaneko <onboarding@resend.dev>",to:[e],subject:`${o} \u2014 Your Karaneko verification code`,html:c})});return t.ok?{success:!0}:{success:!1,error:(await t.json()).message||"Failed to send email"}}catch(t){return console.error("Email send error:",t),{success:!1,error:"Network error sending email"}}}function d(){let e=new Uint32Array(1);return crypto.getRandomValues(e),String(e[0]%1e6).padStart(6,"0")}n.d(i,{k:()=>s,u:()=>d})},a);export{f as __getNamedExports};
