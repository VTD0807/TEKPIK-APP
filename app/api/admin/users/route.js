import { NextResponse } from 'next/server'
import { dbAdmin, authAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { isAdminEmail } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        let snapshot
        try {
            snapshot = await dbAdmin.collection('users').orderBy('createdAt', 'desc').get()
        } catch (err) {
            snapshot = await dbAdmin.collection('users').get()
        }
        let users = []
        snapshot.forEach(doc => {
            let data = doc.data()
            users.push({
                id: doc.id,
                ...data,
                dashboardAccess: data.dashboardAccess || {},
                deviceId: data.deviceId || data.lastDeviceId || null,
                deviceIds: Array.isArray(data.deviceIds) ? data.deviceIds : (data.deviceId ? [data.deviceId] : []),
                createdAt: data.createdAt ? timestampToJSON(data.createdAt) : new Date().toISOString()
            })
        })

        if (users.length === 0 && authAdmin) {
            const authUsers = []
            const result = await authAdmin.listUsers(1000)
            result.users.forEach(u => {
                authUsers.push({
                    id: u.uid,
                    name: u.displayName || (u.email ? u.email.split('@')[0] : 'User'),
                    email: u.email || '',
                    image: u.photoURL || '',
                    role: isAdminEmail(u.email) ? 'ADMIN' : 'USER',
                    dashboardAccess: {},
                    deviceId: null,
                    deviceIds: [],
                    createdAt: u.metadata?.creationTime || new Date().toISOString(),
                })
            })
            return NextResponse.json({ users: authUsers })
        }

        return NextResponse.json({ users })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const { userId, role, dashboardAccess } = await req.json()
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

        const updates = {}
        if (role) updates.role = role
        if (dashboardAccess && typeof dashboardAccess === 'object') {
            updates.dashboardAccess = {
                cms: Boolean(dashboardAccess.cms),
                admin: Boolean(dashboardAccess.admin),
                store: Boolean(dashboardAccess.store),
            }
        }
        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
        }

        await dbAdmin.collection('users').doc(userId).set(updates, { merge: true })
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
