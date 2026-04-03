import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

const toIso = (value) => {
    if (!value) return null
    if (typeof value.toDate === 'function') return value.toDate().toISOString()
    return value instanceof Date ? value.toISOString() : null
}

export async function GET() {
    if (!dbAdmin) return NextResponse.json({ products: [] })

    try {
        const countsSnap = await dbAdmin.collection('analytics_product_view_counts').orderBy('uniqueDeviceViews', 'desc').limit(500).get()

        const countDocs = countsSnap.docs
        const productRefs = countDocs.map(doc => dbAdmin.collection('products').doc(doc.id))

        const productMap = new Map()
        const chunkSize = 100

        for (let i = 0; i < productRefs.length; i += chunkSize) {
            const chunk = productRefs.slice(i, i + chunkSize)
            if (chunk.length === 0) continue
            const docs = await dbAdmin.getAll(...chunk)
            docs.forEach(doc => {
                if (doc.exists) productMap.set(doc.id, { id: doc.id, ...doc.data() })
            })
        }

        const rows = []
        countDocs.forEach(doc => {
            const data = doc.data() || {}
            const product = productMap.get(doc.id)
            rows.push({
                productId: doc.id,
                title: product?.title || product?.name || 'Unknown product',
                price: product?.price ?? null,
                isActive: product?.isActive ?? product?.public ?? true,
                imageUrl: product?.imageUrls?.[0] || product?.image_urls?.[0] || null,
                uniqueDeviceViews: data.uniqueDeviceViews || 0,
                updatedAt: toIso(data.updatedAt),
            })
        })

        return NextResponse.json({ products: rows })
    } catch (err) {
        console.error('[admin-analytics-products]', err)
        return NextResponse.json({ products: [] })
    }
}
