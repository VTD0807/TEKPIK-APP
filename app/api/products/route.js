import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

const normalizeSearchText = (value = '') => String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const tokenizeSearch = (value = '') => normalizeSearchText(value)
    .split(' ')
    .filter(token => token.length > 1)

export async function GET(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')?.toLowerCase()
    const featured = searchParams.get('featured')
    const sort = searchParams.get('sort') || 'newest'
    const page = parseInt(searchParams.get('page') || '1')
    const requestedLimit = parseInt(searchParams.get('limit') || '12')
    const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 12, 160))
    const searchTokens = search ? tokenizeSearch(search) : []

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
            const categoryData = categoriesMap[data.categoryId]
            
            // Client side text search filter
            if (search) {
                const searchStr = normalizeSearchText([
                    data.title,
                    data.name,
                    data.description,
                    data.brand,
                    categoryData?.name,
                    categoryData?.slug,
                    ...(Array.isArray(data.tags) ? data.tags : []),
                    data.metaKeywords,
                ].filter(Boolean).join(' '))

                const matchesQuery = searchStr.includes(normalizeSearchText(search))
                    || (searchTokens.length > 0 && searchTokens.every(token => searchStr.includes(token)))

                if (!matchesQuery) return
            }

            // Client side Category Filter
            const cat = categoryData
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
