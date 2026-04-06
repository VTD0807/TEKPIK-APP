import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { buildProductFeatureVector } from '@/lib/recommendation-features'
import { buildProductIdentity, findExistingProductByIdentity, getIdentityCollectionName } from '@/lib/product-identity'

export const dynamic = 'force-dynamic'

export async function PUT(req, { params }) {
    const { id } = await params
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const body = await req.json()
        const currentSnap = await dbAdmin.collection('products').doc(id).get()
        if (!currentSnap.exists) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const current = currentSnap.data() || {}
        const parsedPrice = Number.parseFloat(body.price)
        const parsedOriginalPrice = body.originalPrice ?? body.original_price
        const parsedDiscount = body.discount ?? body.discount_percentage
        const resolvedAffiliateUrl = body.affiliateUrl ?? body.affiliate_url ?? current.affiliateUrl ?? current.affiliate_url ?? ''
        const resolvedImageUrls = Array.isArray(body.imageUrls)
            ? body.imageUrls
            : (Array.isArray(body.image_urls) ? body.image_urls : (Array.isArray(current.imageUrls) ? current.imageUrls : []))
        const resolvedCategoryId = body.categoryId ?? body.category_id
        const resolvedIsFeatured = body.isFeatured ?? body.is_featured ?? current.isFeatured ?? current.is_featured ?? false
        const resolvedIsActive = body.isActive ?? body.is_active ?? body.public ?? body.isPublic ?? current.isActive ?? current.is_active ?? current.public ?? true

        const identity = buildProductIdentity({
            title: body.title || current.title,
            slug: body.slug || current.slug,
            asin: body.asin || current.asin,
            affiliateUrl: resolvedAffiliateUrl || current.affiliateUrl || current.affiliate_url,
        })

        const duplicate = await findExistingProductByIdentity(dbAdmin, identity, { excludeId: id })
        if (duplicate) {
            return NextResponse.json({
                error: 'Duplicate product detected',
                duplicateProductId: duplicate.id,
            }, { status: 409 })
        }
        
        const updateData = {
            title: body.title ?? current.title,
            description: body.description ?? current.description ?? '',
            price: Number.isFinite(parsedPrice) ? parsedPrice : (Number.isFinite(Number(current.price)) ? Number(current.price) : 0),
            originalPrice: parsedOriginalPrice !== undefined ? (parsedOriginalPrice ? Number.parseFloat(parsedOriginalPrice) : null) : (current.originalPrice ?? current.original_price ?? null),
            discount: parsedDiscount !== undefined ? (Number.parseInt(parsedDiscount) || 0) : (Number.parseInt(current.discount ?? current.discount_percentage) || 0),
            affiliateUrl: resolvedAffiliateUrl,
            affiliateUrlNormalized: identity.affiliateUrlNormalized,
            asin: identity.asin || null,
            brand: body.brand ?? current.brand ?? '',
            imageUrls: resolvedImageUrls,
            isFeatured: !!resolvedIsFeatured,
            isActive: !!resolvedIsActive,
            identityKey: identity.identityKey,
            // Keep legacy keys in sync for old pages still reading snake_case/public.
            affiliate_url: resolvedAffiliateUrl,
            image_urls: resolvedImageUrls,
            original_price: parsedOriginalPrice !== undefined ? (parsedOriginalPrice ? Number.parseFloat(parsedOriginalPrice) : null) : (current.originalPrice ?? current.original_price ?? null),
            category_id: resolvedCategoryId !== undefined ? (resolvedCategoryId || null) : (current.categoryId ?? current.category_id ?? null),
            is_featured: !!resolvedIsFeatured,
            is_active: !!resolvedIsActive,
            public: !!resolvedIsActive,
            updatedAt: new Date(),
        }

        if (body.slug || current.slug) updateData.slug = identity.slug
        if (resolvedCategoryId !== undefined) updateData.categoryId = resolvedCategoryId || null
        if (body.tags !== undefined) updateData.tags = Array.isArray(body.tags) ? body.tags : []

        const identityCollection = dbAdmin.collection(getIdentityCollectionName())
        const previousIdentityKey = String(current.identityKey || '')
        const nextIdentityRef = identityCollection.doc(identity.identityKey)

        await dbAdmin.runTransaction(async (tx) => {
            const nextIdentitySnap = await tx.get(nextIdentityRef)
            const owner = String(nextIdentitySnap.data()?.productId || '')
            if (nextIdentitySnap.exists && owner && owner !== id) {
                throw new Error('DUPLICATE_PRODUCT')
            }

            tx.update(dbAdmin.collection('products').doc(id), updateData)
            tx.set(nextIdentityRef, {
                productId: id,
                slug: identity.slug,
                asin: identity.asin,
                affiliateUrlNormalized: identity.affiliateUrlNormalized,
                updatedAt: new Date(),
            }, { merge: true })

            if (previousIdentityKey && previousIdentityKey !== identity.identityKey) {
                tx.delete(identityCollection.doc(previousIdentityKey))
            }
        })
        const docSnap = await dbAdmin.collection('products').doc(id).get()

        await dbAdmin.collection('analytics_product_feature_vectors').doc(id).set({
            productId: id,
            features: buildProductFeatureVector({ id, ...docSnap.data() }),
            updatedAt: new Date(),
        }, { merge: true })
        
        let product = { id: docSnap.id, ...docSnap.data() }
        product.createdAt = timestampToJSON(product.createdAt)
        product.updatedAt = timestampToJSON(product.updatedAt)

        return NextResponse.json({ product })
    } catch (error) {
        if (error?.message === 'DUPLICATE_PRODUCT') {
            return NextResponse.json({ error: 'Duplicate product detected' }, { status: 409 })
        }
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
        const productRef = dbAdmin.collection('products').doc(id)
        const docSnap = await productRef.get()
        const identityKey = String(docSnap.data()?.identityKey || '')

        await productRef.delete()
        if (identityKey) {
            await dbAdmin.collection(getIdentityCollectionName()).doc(identityKey).delete().catch(() => {})
        }
        await dbAdmin.collection('analytics_product_feature_vectors').doc(id).delete().catch(() => {})
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
