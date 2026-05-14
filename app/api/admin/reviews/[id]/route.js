import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { invalidateReviewCaches } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

export async function PATCH(req, { params }) {
    const { id } = await params
    const db = await getAdminDb()
    if (!db) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const { action } = await req.json()
        const updateData = action === 'approve' ? { isApproved: true }
            : action === 'reject' ? { isApproved: false }
            : action === 'verify' ? { isVerified: true }
            : null

        if (!updateData) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

        await db.collection('reviews').doc(id).update(updateData)
        const docSnap = await db.collection('reviews').doc(id).get()

        // Bust review caches on approval/rejection
        if (action === 'approve' || action === 'reject') {
            const productId = docSnap.data()?.productId
            invalidateReviewCaches(productId)
        }

        return NextResponse.json({ review: { id: docSnap.id, ...docSnap.data() } })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(req, { params }) {
    const { id } = await params
    const db = await getAdminDb()
    if (!db) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        // Get productId before deleting for cache invalidation
        const docSnap = await db.collection('reviews').doc(id).get()
        const productId = docSnap.data()?.productId

        await db.collection('reviews').doc(id).delete()

        invalidateReviewCaches(productId)
        return NextResponse.json({ success: true })
    } catch (error) {
         return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
