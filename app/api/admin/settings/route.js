import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const doc = await dbAdmin.collection('settings').doc('general').get()
        return NextResponse.json(doc.exists ? doc.data() : {})
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function PUT(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const body = await req.json()
        await dbAdmin.collection('settings').doc('general').set(body, { merge: true })
        return NextResponse.json({ success: true })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
