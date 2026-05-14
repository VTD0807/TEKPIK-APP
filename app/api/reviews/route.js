import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { getProductReviews, invalidateReviewCaches } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

    try {
        // Use centralized cached query
        const reviews = await getProductReviews(productId)
        return NextResponse.json({ reviews })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const body = await req.json()
        const {
            productId,
            rating,
            authorName,
            authorImage = '',
            userId = null,
            title,
            body: reviewBody,
            mediaUrls = [],
        } = body

        if (!productId || !rating || !authorName || !title || !reviewBody)
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        if (reviewBody.length < 10)
            return NextResponse.json({ error: 'Review must be at least 10 characters' }, { status: 400 })

        const newReview = {
            productId,
            rating: parseInt(rating),
            authorName,
            authorImage,
            userId,
            title,
            body: reviewBody,
            mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
            isApproved: true,
            isVerified: false,
            helpful: 0,
            likedBy: [],
            dislikedBy: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        const docRef = await dbAdmin.collection('reviews').add(newReview)
        const docSnap = await docRef.get()

        const reviewData = { id: docSnap.id, ...docSnap.data() }

        // ── WRITE-THROUGH: invalidate cached reviews & product detail ──
        invalidateReviewCaches(productId)

        return NextResponse.json({ success: true, review: reviewData }, { status: 201 })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
