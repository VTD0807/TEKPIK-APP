import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { invalidateReviewCaches } from '@/lib/db-queries'
import { sendMail } from '@/lib/mailer'
import { reviewModeratedEmailHtml } from '@/lib/mail-templates'

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
        const reviewData = docSnap.data()

        // Bust review caches on approval/rejection
        if (action === 'approve' || action === 'reject') {
            const productId = reviewData?.productId
            invalidateReviewCaches(productId)
        }

        // Send email notification asynchronously
        if (reviewData?.userId) {
            (async () => {
                try {
                    const [userSnap, productSnap] = await Promise.all([
                        db.collection('users').doc(reviewData.userId).get(),
                        db.collection('products').doc(reviewData.productId).get()
                    ])
                    const userEmail = userSnap.data()?.email
                    const productTitle = productSnap.data()?.title || 'a product'
                    
                    if (userEmail) {
                        const statusLabel = action === 'approve' ? 'Approved' : action === 'verify' ? 'Verified' : 'Rejected'
                        await sendMail({
                            to: userEmail,
                            subject: `Your review was ${statusLabel}`,
                            html: reviewModeratedEmailHtml({
                                productName: productTitle,
                                productUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tekpik.in'}/products/${reviewData.productId}`,
                                status: action === 'approve' ? 'approved' : action === 'verify' ? 'verified' : 'rejected',
                                reviewText: reviewData.body
                            })
                        })
                    }
                } catch (err) {
                    console.error('[Admin] Failed to send review moderation email:', err)
                }
            })()
        }

        return NextResponse.json({ review: { id: docSnap.id, ...reviewData } })
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
