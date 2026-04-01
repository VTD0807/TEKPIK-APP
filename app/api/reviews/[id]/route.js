import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function PATCH(req, { params }) {
    const { id } = await params
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const { action, userId } = await req.json()
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        if (!['like', 'dislike'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

        const ref = dbAdmin.collection('reviews').doc(id)

        const result = await dbAdmin.runTransaction(async (tx) => {
            const snap = await tx.get(ref)
            if (!snap.exists) throw new Error('Review not found')

            const review = snap.data()
            let likedBy = Array.isArray(review.likedBy) ? [...review.likedBy] : []
            let dislikedBy = Array.isArray(review.dislikedBy) ? [...review.dislikedBy] : []

            if (action === 'like') {
                if (likedBy.includes(userId)) {
                    likedBy = likedBy.filter(uid => uid !== userId)
                } else {
                    likedBy.push(userId)
                    dislikedBy = dislikedBy.filter(uid => uid !== userId)
                }
            }

            if (action === 'dislike') {
                if (dislikedBy.includes(userId)) {
                    dislikedBy = dislikedBy.filter(uid => uid !== userId)
                } else {
                    dislikedBy.push(userId)
                    likedBy = likedBy.filter(uid => uid !== userId)
                }
            }

            tx.update(ref, {
                likedBy,
                dislikedBy,
                helpful: likedBy.length,
                updatedAt: new Date(),
            })

            return {
                likedBy,
                dislikedBy,
                helpful: likedBy.length,
            }
        })

        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(req, { params }) {
    const { id } = await params
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const { userId } = await req.json()
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

        const ref = dbAdmin.collection('reviews').doc(id)
        const snap = await ref.get()
        if (!snap.exists) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

        const review = snap.data()
        if (review.userId !== userId) {
            return NextResponse.json({ error: 'Only author can delete this review' }, { status: 403 })
        }

        await ref.delete()
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
