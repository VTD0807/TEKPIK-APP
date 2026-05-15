import { NextResponse } from 'next/server'
import { dbWorkspace, firebaseAdminStatus, invalidateRouterCache } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'
import { invalidateCachePrefix } from '@/lib/server-cache'

export const dynamic = 'force-dynamic'

export async function GET(req) {
    if (!dbWorkspace) return NextResponse.json({ error: 'Workspace DB not initialized' }, { status: 500 })
    
    try {
        const snap = await dbWorkspace.collection('settings').doc('database_router').get()
        const data = snap.exists ? snap.data() : { activeProductionDb: 'primary' }
        return NextResponse.json({
            ...data,
            status: firebaseAdminStatus
        })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(req) {
    if (!dbWorkspace) return NextResponse.json({ error: 'Workspace DB not initialized' }, { status: 500 })
    
    const ctx = await getAccessContext(req)
    if (!hasAdminAccess(ctx, 'admin')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const activeProductionDb = body.activeProductionDb === 'secondary' ? 'secondary' : 'primary'

        await dbWorkspace.collection('settings').doc('database_router').set({
            activeProductionDb,
            updatedAt: new Date(),
            updatedBy: ctx.email || ctx.uid || 'admin',
        }, { merge: true })

        // Immediately bust the in-memory router cache and all data caches
        // so the very next request uses the new database
        invalidateRouterCache()
        invalidateCachePrefix('db:')

        return NextResponse.json({ success: true, activeProductionDb })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
