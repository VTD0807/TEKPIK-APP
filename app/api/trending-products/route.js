import { NextResponse } from 'next/server'
import { getProductionDb, sanitizeFirestoreData } from '@/lib/firebase-admin'
import { calculateContentReliability } from '@/lib/search-intelligence'

export const dynamic = 'force-dynamic'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toDate = (value) => {
    if (!value) return null
    if (value?.toDate && typeof value.toDate === 'function') return value.toDate()
    const dt = new Date(value)
    return Number.isFinite(dt.getTime()) ? dt : null
}

const daysSince = (value) => {
    const dt = toDate(value)
    if (!dt) return 365
    const diff = Date.now() - dt.getTime()
    if (!Number.isFinite(diff) || diff < 0) return 0
    return diff / (1000 * 60 * 60 * 24)
}

const getLimit = (raw, fallback = 12, max = 40) => {
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return fallback
    return Math.max(1, Math.min(Math.floor(parsed), max))
}

const getPopularity = (product = {}) => {
    const views = Number(product.uniqueDeviceViews || 0)
    const reviews = Number(product.reviewCount || product.reviewSummary?.count || 0)
    const wishlist = Number(product.wishlistCount || 0)
    return clamp(
        (Math.log10(views + 1) * 2.6)
        + (Math.log10(reviews + 1) * 2.1)
        + (Math.log10(wishlist + 1) * 1.7),
        0,
        10,
    )
}

const getVelocity = (product = {}) => {
    const ageDays = daysSince(product.updatedAt || product.createdAt)
    const freshBoost = clamp(1 - (ageDays / 14), 0, 1)
    const recentBoost = clamp(1 - (ageDays / 30), 0, 1)
    return (freshBoost * 0.7) + (recentBoost * 0.3)
}

// ── IN-MEMORY CACHE ──────────────────────────────────────────────────────────
let CACHED_TRENDING = null
let CACHED_TIME = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function GET(req) {
    const prodDb = await getProductionDb()
    if (!prodDb) return NextResponse.json({ ok: false, products: [], model: {} })

    try {
        const url = new URL(req.url)
        const limit = getLimit(url.searchParams.get('limit'))

        if (CACHED_TRENDING && (Date.now() - CACHED_TIME < CACHE_TTL_MS)) {
            return NextResponse.json({
                ok: true,
                model: {
                    type: 'trending-hybrid-v1-cached',
                    signals: ['popularity', 'velocity', 'quality', 'reliability', 'discount'],
                },
                products: CACHED_TRENDING.slice(0, limit),
            })
        }

        const [productsSnap, reviewAggSnap, wishlistSnap] = await Promise.all([
            prodDb.collection('products').where('isActive', '==', true).limit(400).get(),
            prodDb.collection('reviews').limit(1500).get(),
            prodDb.collection('wishlists').limit(1500).get(),
        ])

        const reviewCounts = new Map()
        reviewAggSnap.forEach((doc) => {
            const data = doc.data() || {}
            const productId = String(data.productId || data.product_id || '').trim()
            if (!productId) return
            reviewCounts.set(productId, (reviewCounts.get(productId) || 0) + 1)
        })

        const wishlistCounts = new Map()
        wishlistSnap.forEach((doc) => {
            const data = doc.data() || {}
            const productId = String(data.productId || data.product_id || '').trim()
            if (!productId) return
            wishlistCounts.set(productId, (wishlistCounts.get(productId) || 0) + 1)
        })

        const candidates = []
        productsSnap.forEach((doc) => {
            const data = sanitizeFirestoreData({ id: doc.id, ...doc.data() })
            const popularity = getPopularity({
                ...data,
                reviewCount: reviewCounts.get(doc.id) || data.reviewCount || 0,
                wishlistCount: wishlistCounts.get(doc.id) || data.wishlistCount || 0,
            })
            const reliability = calculateContentReliability(data) * 10
            const velocity = getVelocity(data) * 10
            const aiScore = Number(data.ai_analysis?.score || data.aiScore || 0)
            const quality = clamp((Number.isFinite(aiScore) ? aiScore : 0) * 0.5 + reliability * 0.5, 0, 10)

            const score = (
                popularity * 0.38
                + velocity * 0.24
                + quality * 0.2
                + clamp(Number(data.discount || 0) / 10, 0, 9) * 0.1
                + clamp(Number(data.price || 0) > 0 ? 1 - (Number(data.price) / Math.max(Number(data.originalPrice || data.original_price || data.price), 1)) : 0, 0, 1) * 0.08
            )

            candidates.push({
                ...data,
                _trendingScore: Number(score.toFixed(4)),
                _trendingPopularity: Number(popularity.toFixed(2)),
                _trendingReliability: Number(reliability.toFixed(2)),
                _trendingVelocity: Number(velocity.toFixed(2)),
            })
        })

        candidates.sort((a, b) => b._trendingScore - a._trendingScore)
        
        CACHED_TRENDING = candidates
        CACHED_TIME = Date.now()

        return NextResponse.json({
            ok: true,
            model: {
                type: 'trending-hybrid-v1',
                signals: ['popularity', 'velocity', 'quality', 'reliability', 'discount'],
            },
            products: candidates.slice(0, limit),
        })
    } catch (error) {
        console.error('[trending-products]', error)
        return NextResponse.json({ ok: false, products: [], model: {} }, { status: 500 })
    }
}