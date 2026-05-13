import { NextResponse } from 'next/server'
import { getProductionDb, timestampToJSON } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

let CACHED_CATEGORIES = null
let CACHED_TIME = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function GET() {
    const prodDb = await getProductionDb()
    if (!prodDb) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        if (CACHED_CATEGORIES && (Date.now() - CACHED_TIME < CACHE_TTL_MS)) {
            return NextResponse.json(CACHED_CATEGORIES)
        }

        const catSnap = await prodDb.collection('categories').orderBy('name').get()
        let categories = []
        catSnap.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() })
        })

        const prodSnap = await prodDb.collection('products').get()
        const countMap = {}
        prodSnap.forEach(doc => {
            let p = doc.data()
            if (p.categoryId) countMap[p.categoryId] = (countMap[p.categoryId] || 0) + 1
        })

        categories = categories.map(c => ({
            ...c,
            createdAt: timestampToJSON(c.createdAt),
            products: countMap[c.id] || 0
        }))

        CACHED_CATEGORIES = categories
        CACHED_TIME = Date.now()

        return NextResponse.json(categories)
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(req) {
    const prodDb = await getProductionDb()
    if (!prodDb) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const body = await req.json()
        const name = (body.name || '').trim()
        const slug = (body.slug || '').trim().toLowerCase()

        if (!name || !slug) {
            return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
        }

        const normalizedName = name.toLowerCase()
        const allSnap = await prodDb.collection('categories').get()
        const duplicate = allSnap.docs.some(doc => {
            const cat = doc.data()
            return (cat?.name || '').trim().toLowerCase() === normalizedName || (cat?.slug || '').trim().toLowerCase() === slug
        })

        if (duplicate) {
            return NextResponse.json({ error: 'Category with same name or slug already exists' }, { status: 409 })
        }

        const newCat = {
            name,
            slug,
            icon: body.icon || '️',
            description: body.description || '',
            createdAt: new Date(),
        }

        const docRef = await prodDb.collection('categories').add(newCat)
        const docSnap = await docRef.get()

        // Invalidate cache
        CACHED_CATEGORIES = null
        CACHED_TIME = 0

        return NextResponse.json({ id: docSnap.id, ...docSnap.data(), createdAt: timestampToJSON(docSnap.data().createdAt) }, { status: 201 })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
