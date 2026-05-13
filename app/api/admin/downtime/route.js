import { NextResponse } from 'next/server'
import { dbWorkspace } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

export async function GET(req) {
    if (!dbWorkspace) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    
    // We don't require admin access for GET so the middleware/layout can read it fast
    // Actually, we should allow public access so the layout can read it, or we can use a server component.
    // Let's make it public, but only return the necessary flags.
    try {
        const snap = await dbWorkspace.collection('settings').doc('downtime').get()
        const data = snap.exists ? snap.data() : {
            maintenanceMode: false,
            blockedRoutes: [],
            blockBuyNow: false,
            blockSignups: false,
            fallbackUrl: '',
        }
        return NextResponse.json(data)
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(req) {
    if (!dbWorkspace) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    
    const ctx = await getAccessContext(req)
    if (!hasAdminAccess(ctx, 'admin')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const body = await req.json()
        await dbWorkspace.collection('settings').doc('downtime').set({
            maintenanceMode: Boolean(body.maintenanceMode),
            blockedRoutes: Array.isArray(body.blockedRoutes) ? body.blockedRoutes : [],
            blockBuyNow: Boolean(body.blockBuyNow),
            blockSignups: Boolean(body.blockSignups),
            fallbackUrl: body.fallbackUrl || '',
            updatedAt: new Date(),
            updatedBy: ctx.email || ctx.uid || 'admin',
        }, { merge: true })

        return NextResponse.json({ success: true })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
