/**
 * POST /api/admin/mail/seed-templates
 * Seeds built-in starter templates into Firestore (skips if already seeded).
 */
import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tekpik.in'

const SEED_TEMPLATES = [
    {
        name: 'Welcome Email',
        subject: 'Welcome to TEKPIK, {{name}}! 🎉',
        category: 'transactional',
        html: `<p style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px;">Hey {{name}} 👋</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;">Welcome to <strong>TEKPIK</strong>! We curate the best products on Amazon and let our AI break them down honestly — so you always know what you're buying.</p>
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="background:#f8fafc;border-radius:10px;padding:14px 18px;font-size:13px;color:#475569;margin-bottom:8px;">🤖 <strong>AI Analysis</strong> — honest pros &amp; cons on every product</td></tr>
  <tr><td height="8"></td></tr>
  <tr><td style="background:#f8fafc;border-radius:10px;padding:14px 18px;font-size:13px;color:#475569;">❤️ <strong>Wishlist</strong> — save products you love, track price drops</td></tr>
  <tr><td height="8"></td></tr>
  <tr><td style="background:#f8fafc;border-radius:10px;padding:14px 18px;font-size:13px;color:#475569;">⭐ <strong>Community Reviews</strong> — real opinions, moderated</td></tr>
</table>`,
    },
    {
        name: 'Price Drop Alert',
        subject: '🔥 Price dropped on {{productTitle}}',
        category: 'transactional',
        html: `<p style="font-size:13px;font-weight:600;color:#ef4444;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Price Drop Alert</p>
<p style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 16px;">{{productTitle}}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:20px;">
  <tr>
    <td style="padding:6px 0;font-size:13px;color:#64748b;width:140px;">New Price</td>
    <td style="padding:6px 0;font-size:15px;font-weight:700;color:#16a34a;">{{price}}</td>
  </tr>
  <tr>
    <td style="padding:6px 0;font-size:13px;color:#64748b;">Was</td>
    <td style="padding:6px 0;font-size:13px;color:#94a3b8;text-decoration:line-through;">{{originalPrice}}</td>
  </tr>
  <tr>
    <td style="padding:6px 0;font-size:13px;color:#64748b;">You Save</td>
    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#ef4444;">{{discount}}% OFF</td>
  </tr>
</table>`,
    },
    {
        name: 'Weekly Deals Digest',
        subject: '🛍️ This week\'s best deals on TEKPIK',
        category: 'marketing',
        html: `<p style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px;">This Week's Best Deals 🛍️</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;">Hey {{name}}, here are the hottest deals we've found this week — all AI-verified and Amazon-backed.</p>
<div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:16px;">
  <p style="font-size:13px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">Featured Deal</p>
  <p style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 4px;">{{featuredProduct}}</p>
  <p style="font-size:14px;color:#16a34a;font-weight:600;margin:0;">{{featuredPrice}} — {{featuredDiscount}}% off</p>
</div>
<p style="font-size:14px;color:#64748b;margin:0 0 20px;">Plus hundreds more deals waiting for you on TEKPIK.</p>`,
    },
    {
        name: 'Re-engagement (Dormant Users)',
        subject: 'We miss you, {{name}} 👀',
        category: 'marketing',
        html: `<p style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px;">It's been a while, {{name}} 👀</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;">A lot has changed since you last visited TEKPIK. We've added hundreds of new products, improved our AI analysis, and prices have dropped on many items you might love.</p>
<div style="background:#fef3c7;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
  <p style="font-size:14px;color:#92400e;font-weight:600;margin:0;">🎯 Your personalised picks are waiting — come see what's new.</p>
</div>`,
    },
    {
        name: 'New Products in Your Category',
        subject: '✨ New {{category}} products just added',
        category: 'marketing',
        html: `<p style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px;">New in {{category}} ✨</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 24px;">Hey {{name}}, we just added fresh {{category}} products to TEKPIK — all AI-analysed and ready to explore.</p>
<div style="background:#f0fdf4;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
  <p style="font-size:14px;color:#166534;font-weight:600;margin:0 0 4px;">{{productCount}} new products added</p>
  <p style="font-size:13px;color:#4ade80;margin:0;">All with AI scores, honest pros &amp; cons, and live Amazon prices.</p>
</div>`,
    },
    {
        name: 'Wishlist Price Drop',
        subject: '❤️ A product on your wishlist just got cheaper',
        category: 'transactional',
        html: `<p style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px;">Good news, {{name}}! ❤️</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 20px;">A product you wishlisted just dropped in price on Amazon.</p>
<div style="border:2px solid #fca5a5;border-radius:12px;padding:20px;margin-bottom:20px;">
  <p style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 8px;">{{productTitle}}</p>
  <p style="font-size:22px;font-weight:800;color:#16a34a;margin:0 0 4px;">{{price}}</p>
  <p style="font-size:13px;color:#94a3b8;text-decoration:line-through;margin:0 0 8px;">Was {{originalPrice}}</p>
  <p style="font-size:13px;font-weight:600;color:#ef4444;margin:0;">Save {{discount}}% — limited time</p>
</div>`,
    },
    {
        name: 'Monthly Newsletter',
        subject: '📰 TEKPIK Monthly — {{month}} Edition',
        category: 'marketing',
        html: `<p style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px;">TEKPIK Monthly 📰</p>
<p style="font-size:13px;color:#94a3b8;margin:0 0 24px;">{{month}} Edition</p>
<p style="font-size:15px;color:#64748b;line-height:1.7;margin:0 0 20px;">Hey {{name}}, here's what happened on TEKPIK this month — new products, top deals, and community highlights.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
  <tr>
    <td style="background:#f8fafc;border-radius:10px;padding:16px;text-align:center;width:33%;">
      <p style="font-size:24px;font-weight:800;color:#6366f1;margin:0;">{{newProducts}}</p>
      <p style="font-size:12px;color:#64748b;margin:4px 0 0;">New Products</p>
    </td>
    <td width="8"></td>
    <td style="background:#f8fafc;border-radius:10px;padding:16px;text-align:center;width:33%;">
      <p style="font-size:24px;font-weight:800;color:#16a34a;margin:0;">{{dealsCount}}</p>
      <p style="font-size:12px;color:#64748b;margin:4px 0 0;">Deals Found</p>
    </td>
    <td width="8"></td>
    <td style="background:#f8fafc;border-radius:10px;padding:16px;text-align:center;width:33%;">
      <p style="font-size:24px;font-weight:800;color:#f59e0b;margin:0;">{{reviewsCount}}</p>
      <p style="font-size:12px;color:#64748b;margin:4px 0 0;">Reviews Added</p>
    </td>
  </tr>
</table>`,
    },
]

export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'notifications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const force = body.force === true

    const existing = await dbAdmin.collection('mail_templates').where('seeded', '==', true).get()
    const seededNames = new Set()
    existing.forEach(doc => seededNames.add(doc.data()?.name))

    const now = new Date()
    let added = 0
    let skipped = 0

    for (const tpl of SEED_TEMPLATES) {
        if (!force && seededNames.has(tpl.name)) { skipped++; continue }
        const variables = [...new Set([...tpl.html.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))]
        await dbAdmin.collection('mail_templates').add({
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
