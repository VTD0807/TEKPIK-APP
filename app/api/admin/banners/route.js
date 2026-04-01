import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const snap = await dbAdmin.collection('banners').orderBy('createdAt', 'desc').get()
        const banners = []
        snap.forEach(doc => {
            banners.push({ id: doc.id, ...doc.data() })
        })

        const formatted = banners.map(b => ({
            ...b,
            createdAt: timestampToJSON(b.createdAt)
        }))

        return NextResponse.json(formatted)
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const body = await req.json()
        const newBanner = {
            title: body.title || '',
            subtitle: body.subtitle || '',
            priceText: body.priceText || '',
            link: body.link || '',
            bgColor: body.bgColor || 'bg-white',
            imageUrl: body.imageUrl || '',
            isActive: body.isActive !== undefined ? body.isActive : true,
            createdAt: new Date(),
        }

        const docRef = await dbAdmin.collection('banners').add(newBanner)
        const docSnap = await docRef.get()

        return NextResponse.json({ id: docSnap.id, ...docSnap.data(), createdAt: timestampToJSON(docSnap.data().createdAt) }, { status: 201 })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
