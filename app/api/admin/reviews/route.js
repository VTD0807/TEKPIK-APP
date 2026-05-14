import { NextResponse } from 'next/server'
import { getAdminDb, timestampToJSON } from '@/lib/firebase-admin'
import { getAdminCatalog } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

export async function GET(req) {
    const db = await getAdminDb()
    if (!db) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'all'

    try {
        let query = db.collection('reviews').orderBy('createdAt', 'desc')
        if (status === 'pending') query = query.where('isApproved', '==', false)
        if (status === 'approved') query = query.where('isApproved', '==', true)

        // Use cached catalog for product titles instead of fetching ALL products again
        const [snapshot, { products }] = await Promise.all([
            query.get(),
            getAdminCatalog(),
        ])

        const productsMap = {}
        products.forEach(p => { productsMap[p.id] = p.title })

        let reviews = []
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
