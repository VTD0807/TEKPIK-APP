/**
 * POST /api/admin/mail/seed-templates
 * Seeds built-in starter templates into Firestore (skips if already seeded).
 */
import { NextResponse } from 'next/server'
import { dbWorkspace } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tekpik.in'
const LOGO = `<div style="text-align:center;margin-bottom:24px;"><a href="${APP_URL}"><img src="${APP_URL}/icon.png" alt="TEKPIK" width="56" height="56" style="border-radius:14px;box-shadow:0 4px 12px rgba(0,0,0,0.08);" /></a></div>`
const FOOTER = `<div style="margin-top:32px;padding-top:24px;border-top:1px solid #e2e8f0;text-align:center;"><p style="font-size:12px;color:#94a3b8;margin:0;">© TEKPIK. All rights reserved.</p><p style="font-size:12px;color:#94a3b8;margin:4px 0 0;"><a href="${APP_URL}" style="color:#64748b;text-decoration:underline;">Visit Website</a> • <a href="${APP_URL}/privacy" style="color:#64748b;text-decoration:underline;">Privacy Policy</a></p></div>`

const WRAP = (content) => `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;background:#ffffff;">${LOGO}${content}${FOOTER}</div>`

const SEED_TEMPLATES = [
    {
        name: '1. Welcome Email (New User)',
        subject: 'Welcome to TEKPIK, {{name}}! 🎉',
        category: 'transactional',
        html: WRAP(`<p style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px;text-align:center;">Hey {{name}} 👋</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;text-align:center;">Welcome to <strong>TEKPIK</strong>! We curate the best products on Amazon and let our AI break them down honestly.</p>
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="background:#f8fafc;border-radius:10px;padding:16px 20px;font-size:14px;color:#475569;margin-bottom:8px;">🤖 <strong>AI Analysis</strong> — honest pros &amp; cons</td></tr>
  <tr><td height="8"></td></tr>
  <tr><td style="background:#f8fafc;border-radius:10px;padding:16px 20px;font-size:14px;color:#475569;">❤️ <strong>Wishlist</strong> — save products, track price drops</td></tr>
  <tr><td height="8"></td></tr>
  <tr><td style="background:#f8fafc;border-radius:10px;padding:16px 20px;font-size:14px;color:#475569;">⭐ <strong>Community Reviews</strong> — real verified opinions</td></tr>
</table>
<div style="text-align:center;margin-top:24px;"><a href="${APP_URL}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Explore TEKPIK</a></div>`),
    },
    {
        name: '2. Price Drop Alert',
        subject: '🔥 Price dropped on {{productTitle}}',
        category: 'transactional',
        html: WRAP(`<p style="font-size:13px;font-weight:600;color:#ef4444;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;text-align:center;">Price Drop Alert</p>
<p style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 16px;text-align:center;">{{productTitle}}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;background:#f8fafc;">
  <tr>
    <td style="padding:8px 0;font-size:14px;color:#64748b;width:50%;">New Price</td>
    <td style="padding:8px 0;font-size:18px;font-weight:800;color:#16a34a;text-align:right;">{{price}}</td>
  </tr>
  <tr>
    <td style="padding:8px 0;font-size:14px;color:#64748b;">Was</td>
    <td style="padding:8px 0;font-size:14px;color:#94a3b8;text-decoration:line-through;text-align:right;">{{originalPrice}}</td>
  </tr>
  <tr>
    <td style="padding:8px 0;font-size:14px;color:#64748b;">You Save</td>
    <td style="padding:8px 0;font-size:14px;font-weight:700;color:#ef4444;text-align:right;">{{discount}}% OFF</td>
  </tr>
</table>
<div style="text-align:center;"><a href="{{productUrl}}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Deal Now</a></div>`),
    },
    {
        name: '3. Weekly Deals Digest',
        subject: '🛍️ This week\'s best deals on TEKPIK',
        category: 'marketing',
        html: WRAP(`<p style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px;text-align:center;">This Week's Best Deals 🛍️</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;text-align:center;">Hey {{name}}, here are the hottest deals we've found this week — all AI-verified and Amazon-backed.</p>
<div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
  <p style="font-size:13px;font-weight:700;color:#0d9488;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">Featured Deal</p>
  <p style="font-size:18px;font-weight:800;color:#0f172a;margin:0 0 8px;">{{featuredProduct}}</p>
  <p style="font-size:16px;color:#16a34a;font-weight:700;margin:0 0 16px;">{{featuredPrice}} <span style="font-size:14px;color:#ef4444;margin-left:8px;">({{featuredDiscount}}% off)</span></p>
  <a href="${APP_URL}" style="display:inline-block;background:#0d9488;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">Shop Deal</a>
</div>`),
    },
    {
        name: '4. Re-engagement (Miss You)',
        subject: 'We miss you, {{name}} 👀',
        category: 'marketing',
        html: WRAP(`<p style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 12px;text-align:center;">It's been a while, {{name}} 👀</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;text-align:center;">A lot has changed since you last visited TEKPIK. We've added hundreds of new products and prices have dropped on many items you might love.</p>
<div style="background:#fff7ed;border:1px solid #ffedd5;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
  <p style="font-size:15px;color:#9a3412;font-weight:600;margin:0 0 16px;">🎯 Your personalised picks are waiting.</p>
  <a href="${APP_URL}" style="display:inline-block;background:#ea580c;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">See What's New</a>
</div>`),
    },
    {
        name: '5. Database Alert (Admin Notification)',
        subject: '🚨 URGENT: TEKPIK Database Quota Limit Reached',
        category: 'system',
        html: WRAP(`<p style="font-size:20px;font-weight:800;color:#dc2626;margin:0 0 12px;text-align:center;">🚨 System Alert</p>
<p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 20px;">The primary database has hit its daily read/write quota limit (RESOURCE_EXHAUSTED). The DB router has automatically failed over to the secondary database to maintain uptime.</p>
<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px;margin-bottom:24px;border-radius:0 8px 8px 0;">
  <p style="font-size:14px;color:#991b1b;font-weight:600;margin:0 0 4px;">Error Details:</p>
  <p style="font-size:13px;color:#b91c1c;margin:0;font-family:monospace;">{{errorMessage}}</p>
</div>
<p style="font-size:14px;color:#64748b;margin:0 0 24px;">Please check the Firebase Console to monitor usage and consider upgrading your limits if this happens frequently.</p>
<div style="text-align:center;"><a href="https://console.firebase.google.com/" style="display:inline-block;background:#dc2626;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">Open Firebase Console</a></div>`),
    },
    {
        name: '6. Review Approved',
        subject: '✅ Your review is now live!',
        category: 'transactional',
        html: WRAP(`<p style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;text-align:center;">Your review was approved! 🎉</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;text-align:center;">Hey {{name}}, thanks for sharing your honest thoughts on <strong>{{productTitle}}</strong>. Your review has passed our moderation checks and is now visible to the TEKPIK community.</p>
<div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
  <div style="display:flex;align-items:center;margin-bottom:12px;">
    <span style="font-size:18px;margin-right:8px;">⭐ {{rating}}/5</span>
  </div>
  <p style="font-size:14px;color:#334155;margin:0;font-style:italic;">"{{reviewText}}"</p>
</div>`),
    },
    {
        name: '7. Review Rejected',
        subject: 'Update on your recent review',
        category: 'transactional',
        html: WRAP(`<p style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;text-align:center;">Review Update</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;">Hey {{name}}, we couldn't publish your recent review for <strong>{{productTitle}}</strong> because it didn't meet our community guidelines.</p>
<div style="background:#fff1f2;border-radius:12px;padding:16px;margin-bottom:24px;">
  <p style="font-size:14px;color:#be123c;margin:0;">Common reasons include inappropriate language, spam links, or off-topic commentary. Please feel free to submit a revised review!</p>
</div>`),
    },
    {
        name: '8. Product Waitlist Available',
        subject: 'It\'s back! {{productTitle}} is now available',
        category: 'transactional',
        html: WRAP(`<p style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;text-align:center;">Back in Stock! 📦</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;text-align:center;">You asked us to let you know when <strong>{{productTitle}}</strong> was available again. Good news — it's ready to buy!</p>
<div style="text-align:center;"><a href="{{productUrl}}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Buy Now on Amazon</a></div>`),
    },
    {
        name: '9. Account Verification',
        subject: 'Verify your TEKPIK email',
        category: 'system',
        html: WRAP(`<p style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;text-align:center;">Verify Your Email ✉️</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;text-align:center;">Hi {{name}}, please confirm your email address to unlock full access to TEKPIK features like wishlisting and reviewing.</p>
<div style="text-align:center;"><a href="{{verifyUrl}}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Verify Email</a></div>
<p style="font-size:12px;color:#94a3b8;margin-top:24px;text-align:center;">If you didn't create an account, you can safely ignore this email.</p>`),
    },
    {
        name: '10. Password Reset',
        subject: 'Reset your TEKPIK password',
        category: 'system',
        html: WRAP(`<p style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;text-align:center;">Password Reset 🔑</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;text-align:center;">We received a request to reset the password for your TEKPIK account.</p>
<div style="text-align:center;"><a href="{{resetUrl}}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Reset Password</a></div>
<p style="font-size:12px;color:#94a3b8;margin-top:24px;text-align:center;">This link will expire in 1 hour. If you didn't request this, ignore this email.</p>`),
    },
    {
        name: '11. Exclusive Admin Notice',
        subject: 'Important update for TEKPIK Admins',
        category: 'system',
        html: WRAP(`<p style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;text-align:center;">Admin Update 🛠️</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;">Hello {{name}}, this is a system notification for the administrative team.</p>
<div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:16px;margin-bottom:24px;border-radius:0 8px 8px 0;">
  <p style="font-size:14px;color:#334155;margin:0;">{{adminMessage}}</p>
</div>
<div style="text-align:center;"><a href="${APP_URL}/admin" style="display:inline-block;background:#3b82f6;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">Open Dashboard</a></div>`),
    },
    {
        name: '12. AI Analysis Completed',
        subject: '🤖 AI Analysis is ready for {{productTitle}}',
        category: 'notification',
        html: WRAP(`<p style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;text-align:center;">Analysis Complete 🤖</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;text-align:center;">Our AI has finished analyzing <strong>{{productTitle}}</strong> requested by you.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
  <tr>
    <td style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:12px;padding:20px;text-align:center;">
      <p style="font-size:32px;font-weight:800;color:#0d9488;margin:0 0 4px;">{{aiScore}}</p>
      <p style="font-size:13px;color:#0f766e;margin:0;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;">AI Trust Score</p>
    </td>
  </tr>
</table>
<div style="text-align:center;"><a href="{{productUrl}}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Read Full Breakdown</a></div>`),
    },
    {
        name: '13. Trending Product Alert',
        subject: '🚀 {{productTitle}} is blowing up on TEKPIK!',
        category: 'marketing',
        html: WRAP(`<p style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;text-align:center;">Trending Right Now 🚀</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;text-align:center;">Hey {{name}}, <strong>{{productTitle}}</strong> is currently trending across TEKPIK with highly positive reviews.</p>
<div style="text-align:center;"><a href="{{productUrl}}" style="display:inline-block;background:#8b5cf6;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">See What The Hype Is About</a></div>`),
    },
    {
        name: '14. Feedback Request',
        subject: 'How are we doing, {{name}}?',
        category: 'marketing',
        html: WRAP(`<p style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;text-align:center;">We'd love your thoughts 💭</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;text-align:center;">Hey {{name}}, you've been using TEKPIK for a while now. We are constantly improving our AI curation and would love to hear your feedback!</p>
<div style="text-align:center;"><a href="{{feedbackUrl}}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Share Quick Feedback</a></div>`),
    },
    {
        name: '15. Maintenance / Downtime Notice',
        subject: '🚧 TEKPIK Scheduled Maintenance',
        category: 'system',
        html: WRAP(`<p style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;text-align:center;">Scheduled Maintenance 🚧</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 20px;text-align:center;">We will be performing routine system upgrades on <strong>{{date}}</strong>. TEKPIK may be briefly unavailable for approximately {{duration}}.</p>
<div style="background:#f8fafc;border-radius:8px;padding:16px;text-align:center;">
  <p style="font-size:14px;color:#475569;margin:0;">We appreciate your patience while we make TEKPIK faster and better!</p>
</div>`),
    }
]

export async function POST(req) {
    if (!dbWorkspace) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'notifications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const force = body.force === true

    const existing = await dbWorkspace.collection('mail_templates').where('seeded', '==', true).get()
    const seededNames = new Set()
    existing.forEach(doc => seededNames.add(doc.data()?.name))

    const now = new Date()
    let added = 0
    let skipped = 0

    for (const tpl of SEED_TEMPLATES) {
        if (!force && seededNames.has(tpl.name)) { skipped++; continue }
        const variables = [...new Set([...tpl.html.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))]
        await dbWorkspace.collection('mail_templates').add({
            ...tpl,
            variables,
            seeded: true,
            createdAt: now,
            updatedAt: now,
        })
        added++
    }

    return NextResponse.json({ success: true, added, skipped })
}
