/**
 * lib/mail-templates.js
 * All transactional + broadcast HTML email templates.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tekpik.in'

// ─── Shared layout ────────────────────────────────────────────────────────────

function layout({ title, preheader = '', body, footerLinks = [] }) {
    const defaultFooter = [
        { label: 'Visit TEKPIK', href: APP_URL },
        { label: 'Affiliate Disclosure', href: `${APP_URL}/disclosure` },
    ]
    const links = [...defaultFooter, ...footerLinks]
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${title}</title>
${preheader ? `<span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>` : ''}
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.07);">

      <!-- Header -->
      <tr>
        <td style="background:#0f172a;padding:28px 40px;text-align:center;">
          <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">TEKPIK</span>
          <span style="display:block;color:#94a3b8;font-size:12px;margin-top:4px;">Smart product discovery</span>
        </td>
      </tr>

      <!-- Body -->
      <tr><td style="padding:36px 40px 28px;">${body}</td></tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f8fafc;padding:18px 40px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">
            ${links.map(l => `<a href="${l.href}" style="color:#6366f1;text-decoration:none;">${l.label}</a>`).join(' &nbsp;·&nbsp; ')}
          </p>
          <p style="margin:6px 0 0;font-size:11px;color:#cbd5e1;">© ${new Date().getFullYear()} TEKPIK. All rights reserved.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

function btn(label, href, color = '#6366f1') {
    return `<table cellpadding="0" cellspacing="0" style="margin:24px auto 0;">
  <tr><td align="center">
    <a href="${href}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 30px;border-radius:50px;">${label}</a>
  </td></tr>
</table>`
}

function pill(text, color = '#f1f5f9', textColor = '#475569') {
    return `<span style="display:inline-block;background:${color};color:${textColor};font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;margin:2px 3px;">${text}</span>`
}

function section(label, value) {
    return `<tr>
  <td style="padding:6px 0;font-size:13px;color:#64748b;width:140px;vertical-align:top;">${label}</td>
  <td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;">${value}</td>
</tr>`
}

// ─── Welcome ──────────────────────────────────────────────────────────────────

export function welcomeEmailHtml({ name }) {
    return layout({
        title: `Welcome to TEKPIK, ${name}!`,
        preheader: 'Your account is ready. Explore AI-curated products.',
        body: `
<p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0f172a;">Hey ${name} 👋</p>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.7;">
  Welcome to TEKPIK! We curate the best products on Amazon and let our AI break them down honestly — so you always know what you're buying.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
  <tr><td style="background:#f8fafc;border-radius:10px;padding:14px 18px;font-size:13px;color:#475569;margin-bottom:8px;">
    🤖 <strong>AI Analysis</strong> — honest pros &amp; cons on every product
  </td></tr>
  <tr><td style="height:8px;"></td></tr>
  <tr><td style="background:#f8fafc;border-radius:10px;padding:14px 18px;font-size:13px;color:#475569;">
    ❤️ <strong>Wishlist</strong> — save products you love, track price drops
  </td></tr>
  <tr><td style="height:8px;"></td></tr>
  <tr><td style="background:#f8fafc;border-radius:10px;padding:14px 18px;font-size:13px;color:#475569;">
    ⭐ <strong>Community Reviews</strong> — real opinions, moderated
  </td></tr>
</table>
${btn('Explore AI Picks →', `${APP_URL}/ai-picks`)}`,
    })
}

export function welcomeEmailText({ name }) {
    return `Hey ${name},\n\nWelcome to TEKPIK!\n\nExplore AI Picks: ${APP_URL}/ai-picks\n\n— The TEKPIK Team`
}

// ─── Product updated ──────────────────────────────────────────────────────────

export function productUpdatedEmailHtml({ productTitle, brand, price, originalPrice, discount, productUrl, changedFields = [] }) {
    const changes = changedFields.length
        ? changedFields.map(f => pill(f, '#ede9fe', '#6d28d9')).join(' ')
        : pill('price', '#ede9fe', '#6d28d9')

    return layout({
        title: 'Product Updated — TEKPIK',
        preheader: `${productTitle} has been refreshed with the latest data.`,
        body: `
<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:0.1em;">Product Update</p>
<p style="margin:0 0 20px;font-size:20px;font-weight:700;color:#0f172a;">${productTitle}</p>
${brand ? `<p style="margin:0 0 16px;font-size:13px;color:#64748b;">Brand: <strong style="color:#1e293b;">${brand}</strong></p>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:20px;">
  <tbody>
    ${price ? section('Current Price', `<strong style="color:#16a34a;">₹${Number(price).toLocaleString('en-IN')}</strong>`) : ''}
    ${originalPrice && originalPrice > price ? section('Original Price', `<span style="text-decoration:line-through;color:#94a3b8;">₹${Number(originalPrice).toLocaleString('en-IN')}</span>`) : ''}
    ${discount > 0 ? section('Discount', `${pill(discount + '% OFF', '#fef2f2', '#dc2626')}`) : ''}
    ${section('Updated Fields', changes)}
  </tbody>
</table>
${btn('View Product →', productUrl || APP_URL, '#0f172a')}`,
    })
}

// ─── Stale product alert (admin) ──────────────────────────────────────────────

export function staleProductsEmailHtml({ products = [], hoursThreshold = 5 }) {
    const rows = products.slice(0, 20).map(p => `
<tr style="border-top:1px solid #f1f5f9;">
  <td style="padding:10px 12px;font-size:13px;color:#1e293b;">${p.title || 'Unknown'}</td>
  <td style="padding:10px 12px;font-size:12px;color:#64748b;">${p.brand || '—'}</td>
  <td style="padding:10px 12px;font-size:12px;color:#ef4444;font-weight:600;">${p.hoursAgo} hrs ago</td>
</tr>`).join('')

    return layout({
        title: 'Stale Products Alert — TEKPIK',
        preheader: `${products.length} product(s) haven't been updated in over ${hoursThreshold} hours.`,
        body: `
<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#ef4444;text-transform:uppercase;letter-spacing:0.1em;">⚠️ Stale Products Alert</p>
<p style="margin:0 0 20px;font-size:20px;font-weight:700;color:#0f172a;">${products.length} product${products.length !== 1 ? 's' : ''} need updating</p>
<p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">
  The following products haven't been synced from Amazon in over <strong>${hoursThreshold} hours</strong>. Run the product updater to refresh them.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:8px;">
  <thead>
    <tr style="background:#f8fafc;">
      <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#94a3b8;text-align:left;text-transform:uppercase;letter-spacing:0.1em;">Product</th>
      <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#94a3b8;text-align:left;text-transform:uppercase;letter-spacing:0.1em;">Brand</th>
      <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#94a3b8;text-align:left;text-transform:uppercase;letter-spacing:0.1em;">Last Sync</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
${products.length > 20 ? `<p style="font-size:12px;color:#94a3b8;text-align:center;">...and ${products.length - 20} more</p>` : ''}
${btn('Open Product Updater →', `${APP_URL}/admin/product-updater`, '#ef4444')}`,
    })
}

// ─── Work assigned (employee) ─────────────────────────────────────────────────

export function workAssignedEmailHtml({ employeeName, assignedByName, title, description, priority, dueDate, module, workType, assignmentUrl }) {
    const priorityColor = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#22c55e', CRITICAL: '#7c3aed' }[priority] || '#6366f1'

    return layout({
        title: 'New Work Assignment — TEKPIK',
        preheader: `You have a new assignment: ${title}`,
        body: `
<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:0.1em;">New Assignment</p>
<p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a;">${title}</p>
<p style="margin:0 0 20px;font-size:14px;color:#64748b;">Assigned to <strong style="color:#1e293b;">${employeeName}</strong> by ${assignedByName}</p>
${description ? `<p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7;background:#f8fafc;border-radius:10px;padding:14px 18px;">${description}</p>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:8px;">
  <tbody>
    ${section('Priority', pill(priority || 'MEDIUM', priorityColor + '20', priorityColor))}
    ${module ? section('Module', pill(module, '#f1f5f9', '#475569')) : ''}
    ${workType ? section('Type', pill(workType, '#f1f5f9', '#475569')) : ''}
    ${dueDate ? section('Due Date', `<strong>${new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>`) : ''}
  </tbody>
</table>
${btn('View Assignment →', assignmentUrl || `${APP_URL}/admin/work-assignments`, '#0f172a')}`,
    })
}

// ─── Work completed (admin notification) ─────────────────────────────────────

export function workCompletedEmailHtml({ employeeName, title, completedAt, progressPercent = 100, assignmentUrl }) {
    return layout({
        title: 'Work Assignment Completed — TEKPIK',
        preheader: `${employeeName} completed: ${title}`,
        body: `
<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#16a34a;text-transform:uppercase;letter-spacing:0.1em;">✅ Assignment Completed</p>
<p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a;">${title}</p>
<p style="margin:0 0 20px;font-size:14px;color:#64748b;">Completed by <strong style="color:#1e293b;">${employeeName}</strong></p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:8px;">
  <tbody>
    ${section('Progress', `<strong style="color:#16a34a;">${progressPercent}%</strong>`)}
    ${completedAt ? section('Completed At', new Date(completedAt).toLocaleString('en-IN')) : ''}
  </tbody>
</table>
${btn('View Assignment →', assignmentUrl || `${APP_URL}/admin/work-assignments`, '#16a34a')}`,
    })
}

// ─── Review moderated ─────────────────────────────────────────────────────────

export function reviewModeratedEmailHtml({ productName, productUrl, status, reviewText }) {
    const isApproved = status === 'approved' || status === 'verified';
    const statusColor = status === 'approved' ? '#22c55e' : status === 'verified' ? '#6366f1' : '#ef4444';
    const statusLabel = status === 'approved' ? 'Approved' : status === 'verified' ? 'Verified' : 'Rejected';

    return layout({
        title: `Your review was ${statusLabel} — TEKPIK`,
        preheader: `Update on your recent product review.`,
        body: `
<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${statusColor};text-transform:uppercase;letter-spacing:0.1em;">Review ${statusLabel}</p>
<p style="margin:0 0 20px;font-size:20px;font-weight:700;color:#0f172a;">Your review on ${productName || 'a product'}</p>
<p style="margin:0 0 20px;font-size:14px;color:#64748b;">
  ${isApproved 
    ? `Great news! Your review has been <strong>${statusLabel.toLowerCase()}</strong> and is now live on the site.` 
    : `Unfortunately, your review was <strong>rejected</strong> because it did not meet our community guidelines.`}
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:8px;background:#f8fafc;">
  <tbody>
    <tr><td style="font-size:14px;color:#475569;line-height:1.6;font-style:italic;">"${reviewText}"</td></tr>
  </tbody>
</table>
${isApproved && productUrl ? btn('View Product →', productUrl, '#0f172a') : ''}`,
    })
}

// ─── Broadcast (admin → users) ────────────────────────────────────────────────

export function broadcastEmailHtml({ subject, bodyHtml, ctaLabel, ctaUrl }) {
    return layout({
        title: subject,
        preheader: subject,
        body: `
<div style="font-size:15px;color:#475569;line-height:1.75;">${bodyHtml}</div>
${ctaLabel && ctaUrl ? btn(ctaLabel, ctaUrl) : ''}`,
    })
}

// ─── Custom template renderer ─────────────────────────────────────────────────

/**
 * Render a stored template by replacing {{variable}} placeholders.
 */
export function renderTemplate(templateHtml, variables = {}) {
    return templateHtml.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '')
}
