import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

    try {
        const { email } = await req.json()
        const trimmed = String(email || '').trim().toLowerCase()
        
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
        }

        // Check if already subscribed
        const existing = await dbAdmin.collection('newsletter_subscribers')
            .where('email', '==', trimmed)
            .limit(1)
            .get()

        if (!existing.empty) {
            return NextResponse.json({ ok: true, message: 'Already subscribed' })
        }

        await dbAdmin.collection('newsletter_subscribers').add({
            email: trimmed,
            subscribedAt: new Date(),
            source: 'website',
            isActive: true,
        })

        return NextResponse.json({ ok: true, message: 'Subscribed successfully' })
    } catch (error) {
        console.error('[newsletter]', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
