import { NextResponse } from 'next/server'
import { dbAdmin, authAdmin, timestampToJSON, getAdminDb } from '@/lib/firebase-admin'
import { buildProductFeatureVector } from '@/lib/recommendation-features'
import { buildProductIdentity, findExistingProductByIdentity, getIdentityCollectionName } from '@/lib/product-identity'
import { getAdminCatalog, invalidateProductCaches } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

export async function GET() {
    const db = await getAdminDb()
    if (!db) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        // ── USE CENTRALIZED CACHED QUERY ──────────────────────────────────
        const { products } = await getAdminCatalog()
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
        
        // Get current user for tracking who created this product
        let createdBy = null
        const authHeader = req.headers.get('Authorization') || ''
        if (authHeader.startsWith('Bearer ') && authAdmin) {
            try {
                const token = authHeader.slice('Bearer '.length)
                const decoded = await authAdmin.verifyIdToken(token)
                createdBy = decoded.uid
            } catch (err) {
                // If auth fails, continue without createdBy - not critical for creation
            }
        }
        
        const identity = buildProductIdentity({
            title: body.title,
            slug: body.slug,
            asin: body.asin,
            affiliateUrl: resolvedAffiliateUrl,
        })

        const existingProduct = await findExistingProductByIdentity(dbAdmin, identity)
        if (existingProduct) {
            return NextResponse.json({
                error: 'Duplicate product detected',
                duplicateProductId: existingProduct.id,
            }, { status: 409 })
        }

        const newProduct = {
            title: body.title,
            slug: identity.slug,
            description: body.description || '',
            price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
            originalPrice: parsedOriginalPrice ? Number.parseFloat(parsedOriginalPrice) : null,
            discount: Number.parseInt(parsedDiscount) || 0,
            affiliateUrl: resolvedAffiliateUrl,
            affiliateUrlNormalized: identity.affiliateUrlNormalized,
            asin: identity.asin || null,
            brand: body.brand || '',
            imageUrls: resolvedImageUrls,
            isFeatured: !!resolvedIsFeatured,
            isActive: !!resolvedIsActive,
            categoryId: resolvedCategoryId,
            tags: body.tags || [],
            identityKey: identity.identityKey,
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
            ...(createdBy && { createdBy }),
        }

        const docRef = dbAdmin.collection('products').doc()
        const identityRef = dbAdmin.collection(getIdentityCollectionName()).doc(identity.identityKey)
        await dbAdmin.runTransaction(async (tx) => {
            const identitySnap = await tx.get(identityRef)
            const identityOwner = String(identitySnap.data()?.productId || '')
            if (identitySnap.exists && identityOwner && identityOwner !== docRef.id) {
                throw new Error('DUPLICATE_PRODUCT')
            }

            tx.set(docRef, newProduct)
            tx.set(identityRef, {
                productId: docRef.id,
                slug: identity.slug,
                asin: identity.asin,
                affiliateUrlNormalized: identity.affiliateUrlNormalized,
                updatedAt: now,
            }, { merge: true })
        })

        const docSnap = await docRef.get()

        await dbAdmin.collection('analytics_product_feature_vectors').doc(docRef.id).set({
            productId: docRef.id,
            features: buildProductFeatureVector({ id: docRef.id, ...newProduct }),
            updatedAt: now,
        }, { merge: true })

        // ── WRITE-THROUGH: invalidate product caches ──────────────────────
        invalidateProductCaches(docRef.id)
        
        const createdProduct = {
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: timestampToJSON(docSnap.data().createdAt),
            updatedAt: timestampToJSON(docSnap.data().updatedAt)
        }

        return NextResponse.json({ product: createdProduct }, { status: 201 })
    } catch (error) {
        if (error?.message === 'DUPLICATE_PRODUCT') {
            return NextResponse.json({ error: 'Duplicate product detected' }, { status: 409 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
