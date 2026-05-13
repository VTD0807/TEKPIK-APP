/**
 * GET/PUT /api/admin/mail/settings
 * Manage mail automation settings stored in Firestore settings/mail_settings
 */
import { NextResponse } from 'next/server'
import { dbWorkspace } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

const DEFAULTS = {
    welcomeMailEnabled: true,
    welcomeTemplateId: null,       // null = use built-in
    priceDropMailEnabled: true,
    priceDropMinDiscount: 10,      // only notify if discount >= X%
    staleAlertEnabled: true,
    staleAlertHours: 5,
    workAssignMailEnabled: true,
    workCompleteMailEnabled: true,
    unsubscribeEnabled: true,
    fromName: 'TEKPIK',
    replyTo: '',
    useCustomServer: false,
    primaryApiKey: '',
    secondaryApiKey: '',
    secondaryDomain: 'truvgo.me',
    senderEmail: 'hello@tekpik.in',
}

export async function GET(req) {
    if (!dbWorkspace) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'notifications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const snap = await dbWorkspace.collection('settings').doc('mail_settings').get()
    const data = snap.exists ? snap.data() : {}
    return NextResponse.json({ settings: { ...DEFAULTS, ...data } })
}

export async function PUT(req) {
    if (!dbWorkspace) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'notifications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const allowed = Object.keys(DEFAULTS)
    const patch = {}
    allowed.forEach(k => { if (k in body) patch[k] = body[k] })
    patch.updatedAt = new Date()

    await dbWorkspace.collection('settings').doc('mail_settings').set(patch, { merge: true })
    const snap = await dbWorkspace.collection('settings').doc('mail_settings').get()
    return NextResponse.json({ success: true, settings: { ...DEFAULTS, ...snap.data() } })
}
