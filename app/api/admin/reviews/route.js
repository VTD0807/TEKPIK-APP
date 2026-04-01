import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'all'

    try {
        let query = dbAdmin.collection('reviews').orderBy('createdAt', 'desc')
        if (status === 'pending') query = query.where('isApproved', '==', false)
        if (status === 'approved') query = query.where('isApproved', '==', true)

        const snapshot = await query.get()
        let reviews = []
        
        // Fetch all products for titles
        const productSnap = await dbAdmin.collection('products').get()
        const productsMap = {}
        productSnap.forEach(doc => { productsMap[doc.id] = doc.data().title })

        snapshot.forEach(doc => {
            let data = doc.data()
            reviews.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt ? timestampToJSON(data.createdAt) : new Date().toISOString(),
                products: { title: productsMap[data.productId] || 'Unknown Product' }
            })
        })

        return NextResponse.json({ reviews })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
