import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const catSnap = await dbAdmin.collection('categories').orderBy('name').get()
        let categories = []
        catSnap.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() })
        })

        const prodSnap = await dbAdmin.collection('products').get()
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

        return NextResponse.json(categories)
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const body = await req.json()
        const name = (body.name || '').trim()
        const slug = (body.slug || '').trim().toLowerCase()

        if (!name || !slug) {
            return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
        }

        const normalizedName = name.toLowerCase()
        const allSnap = await dbAdmin.collection('categories').get()
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

        const docRef = await dbAdmin.collection('categories').add(newCat)
        const docSnap = await docRef.get()

        return NextResponse.json({ id: docSnap.id, ...docSnap.data(), createdAt: timestampToJSON(docSnap.data().createdAt) }, { status: 201 })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
