import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const snapshot = await dbAdmin.collection('users').orderBy('createdAt', 'desc').get()
        let users = []
        snapshot.forEach(doc => {
            let data = doc.data()
            users.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt ? timestampToJSON(data.createdAt) : new Date().toISOString()
            })
        })

        return NextResponse.json({ users })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const { userId, role } = await req.json()
        if (!userId || !role) return NextResponse.json({ error: 'userId and role required' }, { status: 400 })

        await dbAdmin.collection('users').doc(userId).update({ role })
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
