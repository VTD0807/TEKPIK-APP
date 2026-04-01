import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
    const { id } = await params
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const userSnap = await dbAdmin.collection('users').doc(id).get()
        if (!userSnap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        const user = { id: userSnap.id, ...userSnap.data(), createdAt: timestampToJSON(userSnap.data().createdAt) }

        const reviewSnap = await dbAdmin.collection('reviews')
            .where('userId', '==', id)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get()
        
        let reviewIds = []
        let reviews = []
        reviewSnap.forEach(doc => {
            let data = doc.data()
            if (data.productId) reviewIds.push(data.productId)
            reviews.push({ id: doc.id, ...data, createdAt: timestampToJSON(data.createdAt) })
        })

        const wlSnap = await dbAdmin.collection('wishlists')
            .where('userId', '==', id)
            .orderBy('addedAt', 'desc')
            .limit(30)
            .get()
        
        let wishlists = []
        wlSnap.forEach(doc => {
            let data = doc.data()
            if (data.productId) reviewIds.push(data.productId)
            wishlists.push({ id: doc.id, ...data, addedAt: timestampToJSON(data.addedAt) })
        })

        const productIds = Array.from(new Set(reviewIds)).filter(Boolean)
        const productsMap = {}
        if (productIds.length > 0) {
            const prodSnap = await dbAdmin.collection('products').get()
            prodSnap.forEach(doc => { productsMap[doc.id] = doc.data() })
        }

        reviews = reviews.map(r => ({
            ...r,
            products: productsMap[r.productId] ? {
                title: productsMap[r.productId].title,
                imageUrls: productsMap[r.productId].imageUrls,
                price: productsMap[r.productId].price
            } : null
        }))

        wishlists = wishlists.map(w => ({
            ...w,
            products: productsMap[w.productId] ? {
                id: w.productId,
                title: productsMap[w.productId].title,
                imageUrls: productsMap[w.productId].imageUrls,
                price: productsMap[w.productId].price,
                brand: productsMap[w.productId].brand,
                affiliateUrl: productsMap[w.productId].affiliateUrl
            } : null
        }))

        return NextResponse.json({
            user,
            reviews,
            wishlists
        })

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
