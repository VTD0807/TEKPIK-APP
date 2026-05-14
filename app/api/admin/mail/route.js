/**
 * POST /api/admin/mail  — send broadcast, segment, or single email
 * GET  /api/admin/mail  — fetch recent mail logs
 *
 * Body (POST): {
 *   type: 'broadcast' | 'segment' | 'single' | 'custom',
 *   audienceId?: string,       // for segment sends
 *   to?: string,               // for single send
 *   customEmails?: string[],   // for custom sends
 *   subject: string,
 *   bodyHtml?: string,
 *   ctaLabel?: string,
 *   ctaUrl?: string,
 *   templateId?: string,
 *   variables?: object,        // global static overrides
 *   personalise?: boolean,     // if true, substitute {{name}}/{{email}} per recipient
 * }
 */
import { NextResponse } from 'next/server'
import { dbAdmin, dbWorkspace, getProductionDb } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'
import { sendMail, sendMailBatch } from '@/lib/mailer'
import { broadcastEmailHtml, renderTemplate } from '@/lib/mail-templates'

export const dynamic = 'force-dynamic'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Check if ALL batches failed — means the whole send truly failed. */
function allFailed(results) {
    return results.length > 0 && results.every(r => !r.ok)
}

/** Count how many emails actually succeeded across batches. */
function countSent(results) {
    return results.filter(r => r.ok).reduce((sum, r) => sum + (r.count || 0), 0)
}

/**
 * Send personalised emails to an array of user objects { email, name, ...userData }.
 * When a templateHtml + templateVars are provided, each email gets its own rendered copy
 * with user-specific substitutions ({{name}}, {{email}}, {{first_name}}).
 * Falls back to batch (shared HTML) when no template is used.
 */
async function sendPersonalised(users, { subject, templateHtml, sharedHtml, globalVars, ctaLabel, ctaUrl }) {
    const results = []

    if (templateHtml) {
        // Per-user personalised sends (one API call per user — capped at 500 users to avoid timeout)
        const target = users.slice(0, 500)
        for (const user of target) {
            const perUserVars = {
                ...globalVars,
                name: user.name || user.displayName || 'there',
                first_name: (user.name || user.displayName || 'there').split(' ')[0],
                email: user.email,
                subject,
                ctaLabel: ctaLabel || '',
                ctaUrl: ctaUrl || '',
            }
            const renderedBody = renderTemplate(templateHtml, perUserVars)
            const finalHtml = broadcastEmailHtml({ subject, bodyHtml: renderedBody, ctaLabel, ctaUrl })
            try {
                await sendMail({ to: user.email, subject, html: finalHtml })
                results.push({ ok: true, count: 1 })
            } catch (err) {
                results.push({ ok: false, count: 1, error: err.message })
            }
        }
    } else {
        // No template — batch send shared HTML
        const emails = users.map(u => u.email)
        const batchResults = await sendMailBatch(emails, { subject, html: sharedHtml })
        results.push(...batchResults)
    }

    return results
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req) {
    const prodDb = await getProductionDb() || dbAdmin
    if (!prodDb) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'notifications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const body = await req.json().catch(() => ({}))
        const {
            type = 'broadcast', to, subject, bodyHtml,
            ctaLabel, ctaUrl, templateId, variables = {},
            audienceId, customEmails, personalise = true,
        } = body

        if (!subject) return NextResponse.json({ error: 'subject is required' }, { status: 400 })

        // ── Load template if provided ─────────────────────────────────────────
        // Templates live in dbWorkspace — not in prodDb
        const templateDb = dbWorkspace || prodDb
        let templateHtml = null // raw HTML before variable substitution (used for per-user personalisation)
        let sharedRenderedHtml = bodyHtml || ''

        if (templateId) {
            const tSnap = await templateDb.collection('mail_templates').doc(templateId).get()
            if (!tSnap.exists) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
            const tData = tSnap.data() || {}
            templateHtml = tData.html || ''
            // Also render a shared version (used as fallback / for custom/single sends)
            sharedRenderedHtml = renderTemplate(templateHtml, {
                ...variables, subject,
                ctaLabel: ctaLabel || '', ctaUrl: ctaUrl || '',
            })
        }

        if (!sharedRenderedHtml) {
            return NextResponse.json({ error: 'bodyHtml or templateId is required' }, { status: 400 })
        }

        const sharedFinalHtml = broadcastEmailHtml({ subject, bodyHtml: sharedRenderedHtml, ctaLabel, ctaUrl })

        // ── Custom emails (manually entered) ─────────────────────────────────
        if (type === 'custom') {
            const emails = (customEmails || []).filter(e => typeof e === 'string' && e.includes('@'))
            if (!emails.length) return NextResponse.json({ error: 'No valid emails provided' }, { status: 400 })

            let results
            if (emails.length === 1) {
                try {
                    await sendMail({ to: emails[0], subject, html: sharedFinalHtml })
                    results = [{ ok: true, count: 1 }]
                } catch (err) {
                    results = [{ ok: false, count: 1, error: err.message }]
                }
            } else {
                results = await sendMailBatch(emails, { subject, html: sharedFinalHtml })
            }

            if (allFailed(results)) {
                const firstErr = results.find(r => r.error)?.error || 'All sends failed'
                return NextResponse.json({ error: firstErr }, { status: 502 })
            }

            const sent = countSent(results)
            await prodDb.collection('mail_logs').add({
                type: 'custom', subject,
                recipientCount: sent,
                failed: emails.length - sent,
                recipients: emails.slice(0, 50),
                sentBy: ctx.uid,
                sentByEmail: ctx.user?.email || '',
                templateId: templateId || null,
                createdAt: new Date(),
            })
            return NextResponse.json({ success: true, sent, failed: emails.length - sent, results })
        }

        // ── Segment send ──────────────────────────────────────────────────────
        if (type === 'segment' && audienceId) {
            const segDoc = await prodDb.collection('mail_audience_segments').doc(audienceId).get()
            if (!segDoc.exists) return NextResponse.json({ error: 'Segment not found. Please refresh audience first.' }, { status: 404 })

            const segData = segDoc.data() || {}
            const segEmails = (segData.emails || []).filter(e => typeof e === 'string' && e.includes('@'))
            if (!segEmails.length) return NextResponse.json({ error: 'No emails in this segment' }, { status: 400 })

            let results
            if (personalise && templateHtml) {
                // Load user profiles for personalisation
                const users = await loadUserProfiles(prodDb, segEmails)
                results = await sendPersonalised(users, { subject, templateHtml, sharedHtml: sharedFinalHtml, globalVars: variables, ctaLabel, ctaUrl })
            } else {
                results = await sendMailBatch(segEmails, { subject, html: sharedFinalHtml })
            }

            if (allFailed(results)) {
                const firstErr = results.find(r => r.error)?.error || 'All sends failed'
                return NextResponse.json({ error: firstErr }, { status: 502 })
            }

            const sent = countSent(results)
            await prodDb.collection('mail_logs').add({
                type: 'segment', subject, audienceId,
                audienceName: segData.name || audienceId,
                recipientCount: sent,
                failed: segEmails.length - sent,
                sentBy: ctx.uid,
                sentByEmail: ctx.user?.email || '',
                templateId: templateId || null,
                personalised: !!(personalise && templateHtml),
                createdAt: new Date(),
                results: results.slice(0, 100).map(r => ({ ok: r.ok, count: r.count, error: r.error || null })),
            })
            return NextResponse.json({ success: true, sent, failed: segEmails.length - sent, results })
        }

        // ── Broadcast (all users) ─────────────────────────────────────────────
        if (type === 'broadcast') {
            const usersSnap = await prodDb.collection('users').get()
            const allUsers = []
            usersSnap.forEach(doc => {
                const d = doc.data()
                if (d?.email && typeof d.email === 'string') {
                    allUsers.push({ email: d.email, name: d.name || d.displayName || '' })
                }
            })

            if (!allUsers.length) return NextResponse.json({ error: 'No users found' }, { status: 400 })

            let results
            if (personalise && templateHtml) {
                results = await sendPersonalised(allUsers, { subject, templateHtml, sharedHtml: sharedFinalHtml, globalVars: variables, ctaLabel, ctaUrl })
            } else {
                const emails = allUsers.map(u => u.email)
                results = await sendMailBatch(emails, { subject, html: sharedFinalHtml })
            }

            if (allFailed(results)) {
                const firstErr = results.find(r => r.error)?.error || 'All sends failed'
                return NextResponse.json({ error: firstErr }, { status: 502 })
            }

            const sent = countSent(results)
            await prodDb.collection('mail_logs').add({
                type: 'broadcast', subject,
                recipientCount: sent,
                failed: allUsers.length - sent,
                sentBy: ctx.uid,
                sentByEmail: ctx.user?.email || '',
                templateId: templateId || null,
                personalised: !!(personalise && templateHtml),
                createdAt: new Date(),
                results: results.slice(0, 100).map(r => ({ ok: r.ok, count: r.count, error: r.error || null })),
            })
            return NextResponse.json({ success: true, sent, failed: allUsers.length - sent, results })
        }

        // ── Single send ───────────────────────────────────────────────────────
        if (!to) return NextResponse.json({ error: 'to is required for single send' }, { status: 400 })
        await sendMail({ to, subject, html: sharedFinalHtml })

        await prodDb.collection('mail_logs').add({
            type: 'single', subject, to,
            sentBy: ctx.uid,
            sentByEmail: ctx.user?.email || '',
            templateId: templateId || null,
            createdAt: new Date(),
        })
        return NextResponse.json({ success: true, sent: 1 })

    } catch (err) {
        console.error('[admin/mail]', err)
        return NextResponse.json({ error: err.message || 'Failed to send email' }, { status: 500 })
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Load user profiles from Firestore for a list of emails.
 * Falls back to email-only objects if lookup fails.
 */
async function loadUserProfiles(db, emails) {
    try {
        // Firestore "in" queries are limited to 30 per call — chunk them
        const CHUNK = 30
        const profileMap = {}
        for (let i = 0; i < emails.length; i += CHUNK) {
            const chunk = emails.slice(i, i + CHUNK)
            const snap = await db.collection('users').where('email', 'in', chunk).get()
            snap.forEach(doc => {
                const d = doc.data()
                if (d?.email) profileMap[d.email] = { email: d.email, name: d.name || d.displayName || '' }
            })
        }
        // Ensure every email has an entry (even if no Firestore doc found)
        return emails.map(email => profileMap[email] || { email, name: '' })
    } catch {
        return emails.map(email => ({ email, name: '' }))
    }
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req) {
    const prodDb = await getProductionDb() || dbAdmin
    if (!prodDb) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'notifications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const snap = await prodDb.collection('mail_logs')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get()

        const logs = []
        snap.forEach(doc => {
            const d = doc.data() || {}
            logs.push({
                id: doc.id, ...d,
                createdAt: d.createdAt?.toDate?.()?.toISOString() || d.createdAt || null,
            })
        })
        return NextResponse.json({ logs })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
