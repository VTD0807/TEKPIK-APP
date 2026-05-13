/**
 * GET/POST /api/admin/mail/templates
 * Manage reusable email templates stored in Firestore.
 */
import { NextResponse } from 'next/server'
import { dbWorkspace } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

export async function GET(req) {
    if (!dbWorkspace) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'notifications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const snap = await dbWorkspace.collection('mail_templates').orderBy('createdAt', 'desc').get()
        const templates = []
        snap.forEach(doc => {
            const d = doc.data() || {}
            templates.push({
                id: doc.id,
                name: d.name || '',
                subject: d.subject || '',
                html: d.html || '',
                variables: d.variables || [],
                createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
                updatedAt: d.updatedAt?.toDate?.()?.toISOString() || null,
            })
        })
        return NextResponse.json({ templates })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req) {
    if (!dbWorkspace) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'notifications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const name = String(body.name || '').trim()
    const subject = String(body.subject || '').trim()
    const html = String(body.html || '').trim()

    if (!name || !subject || !html) {
        return NextResponse.json({ error: 'name, subject, and html are required' }, { status: 400 })
    }

    // Extract {{variable}} placeholders
    const variables = [...new Set([...html.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))]

    const now = new Date()
    try {
        const ref = await dbWorkspace.collection('mail_templates').add({
        name,
        subject,
        html,
        variables,
        createdBy: ctx.uid,
        createdAt: now,
        updatedAt: now,
    })

        return NextResponse.json({ success: true, id: ref.id, variables })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
