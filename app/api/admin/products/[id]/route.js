import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function PUT(req, { params }) {
    const { id } = await params
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const body = await req.json()
        const parsedPrice = Number.parseFloat(body.price)
        const parsedOriginalPrice = body.originalPrice ?? body.original_price
        const parsedDiscount = body.discount ?? body.discount_percentage
        const resolvedAffiliateUrl = body.affiliateUrl || body.affiliate_url || ''
        const resolvedImageUrls = Array.isArray(body.imageUrls)
            ? body.imageUrls
            : (Array.isArray(body.image_urls) ? body.image_urls : [])
        const resolvedCategoryId = body.categoryId ?? body.category_id
        const resolvedIsFeatured = body.isFeatured ?? body.is_featured ?? false
        const resolvedIsActive = body.isActive ?? body.is_active ?? body.public ?? body.isPublic ?? true
        
        const updateData = {
            title: body.title,
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
            // Keep legacy keys in sync for old pages still reading snake_case/public.
            affiliate_url: resolvedAffiliateUrl,
            image_urls: resolvedImageUrls,
            original_price: parsedOriginalPrice ? Number.parseFloat(parsedOriginalPrice) : null,
            category_id: resolvedCategoryId || null,
            is_featured: !!resolvedIsFeatured,
            is_active: !!resolvedIsActive,
            public: !!resolvedIsActive,
            updatedAt: new Date(),
        }

        if (body.slug) updateData.slug = body.slug
        if (resolvedCategoryId !== undefined) updateData.categoryId = resolvedCategoryId || null
        if (body.tags !== undefined) updateData.tags = Array.isArray(body.tags) ? body.tags : []

        await dbAdmin.collection('products').doc(id).update(updateData)
        const docSnap = await dbAdmin.collection('products').doc(id).get()
        
        let product = { id: docSnap.id, ...docSnap.data() }
        product.createdAt = timestampToJSON(product.createdAt)
        product.updatedAt = timestampToJSON(product.updatedAt)

        return NextResponse.json({ product })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(req, ctx) {
    return PUT(req, ctx)
}

export async function DELETE(req, { params }) {
    const { id } = await params
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        await dbAdmin.collection('products').doc(id).delete()
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
