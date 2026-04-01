import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')?.toLowerCase()
    const featured = searchParams.get('featured')
    const sort = searchParams.get('sort') || 'newest'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')

    try {
        let query = dbAdmin.collection('products').where('isActive', '==', true)

        if (featured === 'true') {
            query = query.where('isFeatured', '==', true)
        }

        if (sort === 'price_asc') query = query.orderBy('price', 'asc')
        else if (sort === 'price_desc') query = query.orderBy('price', 'desc')
        else query = query.orderBy('createdAt', 'desc')

        const snapshot = await query.get()
        let products = []
        
        // Categories mapping to join manually
        const categoriesSnap = await dbAdmin.collection('categories').get()
        const categoriesMap = {}
        categoriesSnap.forEach(doc => { categoriesMap[doc.id] = doc.data() })

        snapshot.forEach(doc => {
            const data = doc.data()
            
            // Client side text search filter
            if (search) {
                const searchStr = `${data.title} ${data.description} ${data.brand}`.toLowerCase()
                if (!searchStr.includes(search)) return
            }

            // Client side Category Filter
            const cat = categoriesMap[data.categoryId]
            if (category && cat?.slug !== category) return

            products.push({ 
                id: doc.id, 
                ...data, 
                createdAt: timestampToJSON(data.createdAt),
                updatedAt: timestampToJSON(data.updatedAt),
                categories: cat || null 
            })
        })

        const total = products.length
        const start = (page - 1) * limit
        const paginatedProducts = products.slice(start, start + limit)

        return NextResponse.json({ 
            products: paginatedProducts, 
            total, 
            page, 
            pages: Math.ceil((total || 0) / limit) 
        })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
