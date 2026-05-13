/**
 * POST /api/admin/auto-categorise
 * Auto-categorise products that have no category (or all products if force=true).
 *
 * Body: { productId?: string, force?: boolean, dryRun?: boolean, minConfidence?: number }
 * - productId: run on a single product
 * - force: re-categorise even if already categorised
 * - dryRun: preview without writing
 * - minConfidence: 0-1, default 0.3
 */
import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'
import { autoCategories } from '@/lib/auto-categorise'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'products')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const body = await req.json().catch(() => ({}))
        const { productId, force = false, dryRun = false, minConfidence = 0.3 } = body

        // Load all categories once
        const catSnap = await dbAdmin.collection('categories').get()
        const categories = []
        catSnap.forEach((doc) => categories.push({ id: doc.id, ...doc.data() }))

        if (!categories.length) {
            return NextResponse.json({ error: 'No categories found. Create categories first.' }, { status: 400 })
        }

        // Load products
        let products = []
        if (productId) {
            const snap = await dbAdmin.collection('products').doc(productId).get()
            if (!snap.exists) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
            products = [{ id: snap.id, ...snap.data() }]
        } else {
            const snap = await dbAdmin.collection('products').get()
            snap.forEach((doc) => {
                const d = doc.data() || {}
                // Only process uncategorised unless force=true
                if (!force && d.categoryId) return
                products.push({ id: doc.id, ...d })
            })
        }

        if (!products.length) {
            return NextResponse.json({ success: true, message: 'All products already categorised.', results: [] })
        }

        const results = []
        const BATCH_SIZE = 10

        for (let i = 0; i < products.length; i += BATCH_SIZE) {
            const chunk = products.slice(i, i + BATCH_SIZE)

            await Promise.all(chunk.map(async (product) => {
                try {
                    const match = await autoCategories(product, categories, {
                        minConfidence,
                        forceAI: force && Boolean(product.categoryId),
                    })

                    if (!match) {
                        results.push({
                            productId: product.id,
                            productTitle: product.title || product.name || '',
                            status: 'unmatched',
                            previousCategoryId: product.categoryId || null,
                        })
                        return
                    }

                    if (!dryRun) {
                        await dbAdmin.collection('products').doc(product.id).update({
                            categoryId: match.categoryId,
                            category_id: match.categoryId,
                            updatedAt: new Date(),
                        })
                    }

                    results.push({
                        productId: product.id,
                        productTitle: product.title || product.name || '',
                        status: dryRun ? 'preview' : 'updated',
                        previousCategoryId: product.categoryId || null,
                        newCategoryId: match.categoryId,
                        newCategoryName: match.categoryName,
                        confidence: match.confidence,
                        method: match.method,
                    })
                } catch (err) {
                    results.push({
                        productId: product.id,
                        productTitle: product.title || product.name || '',
                        status: 'error',
                        error: err.message,
                    })
                }
            }))
        }

        const updated = results.filter((r) => r.status === 'updated' || r.status === 'preview').length
        const unmatched = results.filter((r) => r.status === 'unmatched').length
        const errors = results.filter((r) => r.status === 'error').length

        return NextResponse.json({
            success: true,
            dryRun,
            total: products.length,
            updated,
            unmatched,
            errors,
            results,
        })
    } catch (err) {
        console.error('[auto-categorise]', err)
        return NextResponse.json({ error: err.message || 'Auto-categorisation failed' }, { status: 500 })
    }
}

// GET — stats: how many products are uncategorised
export async function GET(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'products')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const snap = await dbAdmin.collection('products').get()
        let total = 0, uncategorised = 0
        snap.forEach((doc) => {
            total++
            if (!doc.data()?.categoryId) uncategorised++
        })
        return NextResponse.json({ total, uncategorised, categorised: total - uncategorised })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
