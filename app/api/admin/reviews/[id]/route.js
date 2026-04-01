import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function PATCH(req, { params }) {
    const { id } = await params
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const { action } = await req.json()
        const updateData = action === 'approve' ? { isApproved: true }
            : action === 'reject' ? { isApproved: false }
            : action === 'verify' ? { isVerified: true }
            : null

        if (!updateData) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

        await dbAdmin.collection('reviews').doc(id).update(updateData)
        const docSnap = await dbAdmin.collection('reviews').doc(id).get()

        return NextResponse.json({ review: { id: docSnap.id, ...docSnap.data() } })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(req, { params }) {
    const { id } = await params
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        await dbAdmin.collection('reviews').doc(id).delete()
        return NextResponse.json({ success: true })
    } catch (error) {
         return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
