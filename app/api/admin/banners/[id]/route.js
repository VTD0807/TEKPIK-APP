import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function PUT(req, { params }) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const { id } = await params
        const body = await req.json()

        const updates = {
            title: body.title,
            subtitle: body.subtitle,
            priceText: body.priceText,
            link: body.link,
            bgColor: body.bgColor,
            imageUrl: body.imageUrl,
            isActive: body.isActive,
            updatedAt: new Date(),
        }

        // Remove undefined fields
        Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key])

        await dbAdmin.collection('banners').doc(id).update(updates)
        return NextResponse.json({ success: true })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(req, { params }) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const { id } = await params
        await dbAdmin.collection('banners').doc(id).delete()
        return NextResponse.json({ success: true })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
