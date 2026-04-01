import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
    const { id } = await params
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const productSnap = await dbAdmin.collection('products').doc(id).get()
        if (!productSnap.exists) {
            // Also try finding by slug since frontend might pass slug as ID
            const slugSnap = await dbAdmin.collection('products').where('slug', '==', id).limit(1).get()
            if (slugSnap.empty) return NextResponse.json({ error: 'Not found' }, { status: 404 })
            const doc = slugSnap.docs[0]
            await fetchJoins(doc)
            return
        }

        async function fetchJoins(doc) {
            let product = { id: doc.id, ...doc.data() }
            product.createdAt = timestampToJSON(product.createdAt)
            product.updatedAt = timestampToJSON(product.updatedAt)

            // Fetch Category
            if (product.categoryId) {
                const catSnap = await dbAdmin.collection('categories').doc(product.categoryId).get()
                if (catSnap.exists) product.categories = catSnap.data()
            }

            // In Firebase we assume ai_analysis is an object inside product or parallel collection
            // Let's assume parallel collection 'ai_analysis' with same doc ID, or field `aiAnalysis`
            const aiSnap = await dbAdmin.collection('ai_analysis').where('productId', '==', product.id).limit(1).get()
            if (!aiSnap.empty) {
                product.ai_analysis = { id: aiSnap.docs[0].id, ...aiSnap.docs[0].data(), generatedAt: timestampToJSON(aiSnap.docs[0].data().generatedAt) }
            } else {
                product.ai_analysis = null
            }

            // Fetch Reviews
            const reviewsSnap = await dbAdmin.collection('reviews')
                .where('productId', '==', product.id)
                .where('isApproved', '==', true)
                .get()
            
            product.reviews = reviewsSnap.docs.map(r => ({
                id: r.id,
                ...r.data(),
                createdAt: timestampToJSON(r.data().createdAt)
            }))

            return NextResponse.json(product)
        }

        return await fetchJoins(productSnap)

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
