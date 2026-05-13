/**
 * PUT/DELETE /api/admin/mail/templates/[id]
 */
import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

export async function PUT(req, { params }) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'notifications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const updates = { updatedAt: new Date() }

    if (body.name !== undefined) updates.name = String(body.name).trim()
    if (body.subject !== undefined) updates.subject = String(body.subject).trim()
    if (body.html !== undefined) {
        updates.html = String(body.html).trim()
        updates.variables = [...new Set([...updates.html.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))]
    }

    await dbAdmin.collection('mail_templates').doc(id).set(updates, { merge: true })
    return NextResponse.json({ success: true })
}

export async function DELETE(req, { params }) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'notifications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    await dbAdmin.collection('mail_templates').doc(id).delete()
    return NextResponse.json({ success: true })
}
