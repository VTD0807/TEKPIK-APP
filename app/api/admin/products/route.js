import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { buildProductFeatureVector } from '@/lib/recommendation-features'

export const dynamic = 'force-dynamic'

export async function GET() {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const snapshot = await dbAdmin.collection('products').orderBy('createdAt', 'desc').get()
        let products = []

        // Categories mapping
        const categoriesSnap = await dbAdmin.collection('categories').get()
        const categoriesMap = {}
        categoriesSnap.forEach(doc => { categoriesMap[doc.id] = doc.data() })

        // AI analysis mapping
        const aiSnap = await dbAdmin.collection('ai_analysis').get()
        const aiMap = {}
        aiSnap.forEach(doc => { aiMap[doc.data().productId] = doc.data() })

        snapshot.forEach(doc => {
            let data = doc.data()
            let cat = categoriesMap[data.categoryId]
            let ai = aiMap[doc.id]

            products.push({
                id: doc.id,
                ...data,
                createdAt: timestampToJSON(data.createdAt),
                updatedAt: timestampToJSON(data.updatedAt),
                categories: cat ? { name: cat.name, slug: cat.slug } : null,
                ai_analysis: ai ? { score: ai.score, generatedAt: timestampToJSON(ai.generatedAt) } : null
            })
        })

        return NextResponse.json({ products })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    
    try {
        const body = await req.json()
        const now = new Date()
        const parsedPrice = Number.parseFloat(body.price)
        const parsedOriginalPrice = body.originalPrice ?? body.original_price
        const parsedDiscount = body.discount ?? body.discount_percentage
        const resolvedAffiliateUrl = body.affiliateUrl || body.affiliate_url || ''
        const resolvedImageUrls = Array.isArray(body.imageUrls)
            ? body.imageUrls
            : (Array.isArray(body.image_urls) ? body.image_urls : [])
        const resolvedCategoryId = body.categoryId ?? body.category_id ?? null
        const resolvedIsFeatured = body.isFeatured ?? body.is_featured ?? false
        const resolvedIsActive = body.isActive ?? body.is_active ?? body.public ?? body.isPublic ?? true
        
        const newProduct = {
            title: body.title,
            slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description: body.description || '',
            price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
            originalPrice: parsedOriginalPrice ? Number.parseFloat(parsedOriginalPrice) : null,
            discount: Number.parseInt(parsedDiscount) || 0,
            affiliateUrl: resolvedAffiliateUrl,
            asin: body.asin || null,
            brand: body.brand || '',
            imageUrls: resolvedImageUrls,
            isFeatured: !!resolvedIsFeatured,
            isActive: !!resolvedIsActive,
            categoryId: resolvedCategoryId,
            tags: body.tags || [],
            // Keep legacy keys in sync for old pages still reading snake_case/public.
            affiliate_url: resolvedAffiliateUrl,
            image_urls: resolvedImageUrls,
            original_price: parsedOriginalPrice ? Number.parseFloat(parsedOriginalPrice) : null,
            category_id: resolvedCategoryId,
            is_featured: !!resolvedIsFeatured,
            is_active: !!resolvedIsActive,
            public: !!resolvedIsActive,
            createdAt: now,
            updatedAt: now,
        }

        const docRef = await dbAdmin.collection('products').add(newProduct)
        const docSnap = await docRef.get()

        await dbAdmin.collection('analytics_product_feature_vectors').doc(docRef.id).set({
            productId: docRef.id,
            features: buildProductFeatureVector({ id: docRef.id, ...newProduct }),
            updatedAt: now,
        }, { merge: true })
        
        const createdProduct = {
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: timestampToJSON(docSnap.data().createdAt),
            updatedAt: timestampToJSON(docSnap.data().updatedAt)
        }

        return NextResponse.json({ product: createdProduct }, { status: 201 })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
