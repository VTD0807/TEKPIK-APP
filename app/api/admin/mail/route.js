/**
 * POST /api/admin/mail  — send broadcast, segment, or single email
 * GET  /api/admin/mail  — fetch recent mail logs
 *
 * Body (POST): {
 *   type: 'broadcast' | 'segment' | 'single' | 'custom',
 *   audienceId?: string,       // for segment sends — looks up saved segment emails
 *   to?: string,               // for single send
 *   customEmails?: string[],   // for custom sends — manually entered emails
 *   subject: string,
 *   bodyHtml?: string,
 *   ctaLabel?: string,
 *   ctaUrl?: string,
 *   templateId?: string,
 *   variables?: object,
 * }
 */
import { NextResponse } from 'next/server'
import { dbAdmin, dbWorkspace, getProductionDb } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'
import { sendMail, sendMailBatch } from '@/lib/mailer'
import { broadcastEmailHtml, renderTemplate } from '@/lib/mail-templates'

export const dynamic = 'force-dynamic'

export async function POST(req) {
    const prodDb = await getProductionDb() || dbAdmin
    if (!prodDb) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'notifications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const body = await req.json().catch(() => ({}))
        const { type = 'broadcast', to, subject, bodyHtml, ctaLabel, ctaUrl, templateId, variables = {}, audienceId, customEmails } = body

        if (!subject) return NextResponse.json({ error: 'subject is required' }, { status: 400 })

        let html = bodyHtml || ''

        // If a saved template is referenced, load and render it
        // Templates are stored in dbWorkspace (not prodDb) — this is where /api/admin/mail/templates writes them
        const templateDb = dbWorkspace || prodDb
        if (templateId) {
            const tSnap = await templateDb.collection('mail_templates').doc(templateId).get()
            if (!tSnap.exists) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
            const tData = tSnap.data() || {}
            html = renderTemplate(tData.html || '', {
                ...variables,
                subject,
                ctaLabel: ctaLabel || '',
                ctaUrl: ctaUrl || '',
            })
        }

        if (!html) return NextResponse.json({ error: 'bodyHtml or templateId is required' }, { status: 400 })

        const finalHtml = broadcastEmailHtml({ subject, bodyHtml: html, ctaLabel, ctaUrl })

        // ── Custom emails (manually entered) ─────────────────────────────────
        if (type === 'custom') {
            const emails = (customEmails || []).filter(e => typeof e === 'string' && e.includes('@'))
            if (!emails.length) return NextResponse.json({ error: 'No valid emails provided' }, { status: 400 })

            if (emails.length === 1) {
                await sendMail({ to: emails[0], subject, html: finalHtml })
            } else {
                await sendMailBatch(emails, { subject, html: finalHtml })
            }

            await prodDb.collection('mail_logs').add({
                type: 'custom',
                subject,
                recipientCount: emails.length,
                recipients: emails.slice(0, 50), // store up to 50 for reference
                sentBy: ctx.uid,
                sentByEmail: ctx.user?.email || '',
                templateId: templateId || null,
                createdAt: new Date(),
            })

            return NextResponse.json({ success: true, sent: emails.length })
        }

        // ── Segment send ─────────────────────────────────────────────────────
        if (type === 'segment' && audienceId) {
            // Load saved segment from Firestore
            const segDoc = await prodDb.collection('mail_audience_segments').doc(audienceId).get()
            if (!segDoc.exists) return NextResponse.json({ error: 'Segment not found. Please refresh audience first.' }, { status: 404 })

            const segData = segDoc.data() || {}
            const emails = (segData.emails || []).filter(e => typeof e === 'string' && e.includes('@'))

            if (!emails.length) return NextResponse.json({ error: 'No emails in this segment' }, { status: 400 })

            const results = await sendMailBatch(emails, { subject, html: finalHtml })

            await prodDb.collection('mail_logs').add({
                type: 'segment',
                subject,
                audienceId,
                audienceName: segData.name || audienceId,
                recipientCount: emails.length,
                sentBy: ctx.uid,
                sentByEmail: ctx.user?.email || '',
                templateId: templateId || null,
                createdAt: new Date(),
                results: results.map((r) => ({ ok: r.ok, count: r.count, error: r.error || null })),
            })

            return NextResponse.json({ success: true, sent: emails.length, results })
        }

        // ── Broadcast (all users) ────────────────────────────────────────────
        if (type === 'broadcast') {
            const usersSnap = await prodDb.collection('users').get()
            const emails = []
            usersSnap.forEach((doc) => {
                const email = doc.data()?.email
                if (email && typeof email === 'string') emails.push(email)
            })

            if (!emails.length) return NextResponse.json({ error: 'No users found' }, { status: 400 })

            const results = await sendMailBatch(emails, { subject, html: finalHtml })

            await prodDb.collection('mail_logs').add({
                type: 'broadcast',
                subject,
                recipientCount: emails.length,
                sentBy: ctx.uid,
                sentByEmail: ctx.user?.email || '',
                templateId: templateId || null,
                createdAt: new Date(),
                results: results.map((r) => ({ ok: r.ok, count: r.count, error: r.error || null })),
            })

            return NextResponse.json({ success: true, sent: emails.length, results })
        }

        // ── Single send ──────────────────────────────────────────────────────
        if (!to) return NextResponse.json({ error: 'to is required for single send' }, { status: 400 })
        await sendMail({ to, subject, html: finalHtml })

        await prodDb.collection('mail_logs').add({
            type: 'single',
            subject,
            to,
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
        snap.forEach((doc) => {
            const d = doc.data() || {}
            logs.push({
                id: doc.id,
                ...d,
                createdAt: d.createdAt?.toDate?.()?.toISOString() || d.createdAt || null,
            })
        })

        return NextResponse.json({ logs })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
