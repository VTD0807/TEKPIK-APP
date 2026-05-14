import { NextResponse } from 'next/server'
import { dbPrimary, dbSecondary, dbUsers, dbWorkspace } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

async function pingDatabase(db, name) {
    if (!db) return { name, status: 'offline', latency: 0, error: 'Not Configured' }
    
    const start = Date.now()
    try {
        // Minimal query to check if DB responds
        await db.collection('_system_pings_').doc('health_check').get()
        return { name, status: 'healthy', latency: Date.now() - start, error: null }
    } catch (err) {
        if (err?.code === 8 || (err?.message && err.message.includes('RESOURCE_EXHAUSTED'))) {
            return { name, status: 'exhausted', latency: Date.now() - start, error: 'Quota Exceeded (Limit Hit)' }
        }
        return { name, status: 'error', latency: Date.now() - start, error: err.message }
    }
}

export async function GET(req) {
    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'settings')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const [primary, secondary, users, workspace] = await Promise.all([
        pingDatabase(dbPrimary, 'DB-1 (Primary)'),
        pingDatabase(dbSecondary, 'DB-2 (Secondary)'),
        pingDatabase(dbUsers, 'DB-3 (Users)'),
        pingDatabase(dbWorkspace, 'DB-4 (Workspace)')
    ])

    return NextResponse.json({
        databases: [primary, secondary, users, workspace],
        timestamp: new Date().toISOString()
    })
}
