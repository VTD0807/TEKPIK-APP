/**
 * Welcome email HTML template
 */
export function welcomeEmailHtml({ name, appUrl = 'http://localhost:3000' }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Welcome to TEKPIK</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">TEKPIK</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Smart product discovery, powered by AI</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1e293b;">Hey ${name} </p>
              <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
                Welcome to TEKPIK! You're all set. We curate the best products on Amazon and let our AI break them down honestly — so you always know what you're buying.
              </p>

              <!-- Feature pills -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:4px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#f1f5f9;border-radius:8px;padding:10px 14px;font-size:13px;color:#475569;">
                           <strong>AI Analysis</strong> — honest pros &amp; cons on every product
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#f1f5f9;border-radius:8px;padding:10px 14px;font-size:13px;color:#475569;">
                          ️ <strong>Wishlist</strong> — save products you love
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#f1f5f9;border-radius:8px;padding:10px 14px;font-size:13px;color:#475569;">
                          ⭐ <strong>Community Reviews</strong> — real opinions, moderated
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/ai-picks"
                       style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;border-radius:50px;">
                      Explore AI Picks →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                You're receiving this because you signed up at TEKPIK.<br/>
                <a href="${appUrl}/disclosure" style="color:#6366f1;text-decoration:none;">Affiliate Disclosure</a>
                &nbsp;·&nbsp;
                <a href="${appUrl}" style="color:#6366f1;text-decoration:none;">Visit TEKPIK</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function welcomeEmailText({ name }) {
    return `Hey ${name},

Welcome to TEKPIK! You're all set.

We curate the best products on Amazon and let our AI break them down honestly — so you always know what you're buying.

What you get:
- AI Analysis: honest pros & cons on every product
- Wishlist: save products you love
- Community Reviews: real opinions, moderated

Visit TEKPIK: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}

— The TEKPIK Team`
}
