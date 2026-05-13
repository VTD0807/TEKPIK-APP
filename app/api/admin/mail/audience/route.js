/**
 * GET  /api/admin/mail/audience         — load cached segments from Firestore
 * GET  /api/admin/mail/audience?refresh=true — re-analyse + persist + return
 * POST /api/admin/mail/audience         — force full re-analysis and persist
 *
 * Segments are saved to `mail_audience_segments` collection.
 * Each segment doc: { id, name, description, userCount, emails[], updatedAt }
 */
import { NextResponse } from 'next/server'
import { dbAdmin, dbWorkspace, dbUsers } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

const normalize = (s = '') => String(s).toLowerCase().trim()

// ── Analyse + persist ────────────────────────────────────────────────────────
async function analyseAndPersist() {
    // Load all users from DB-3
    const usersSnap = await dbUsers.collection('users').get()
    const users = new Map()
    usersSnap.forEach(doc => {
        const d = doc.data() || {}
        if (d.email) users.set(doc.id, { id: doc.id, email: d.email, name: d.name || '', createdAt: d.createdAt?.toDate?.() || null, role: d.role || 'USER' })
    })

    const allUserIds = Array.from(users.keys())
    if (!allUserIds.length) return { segments: [], totalUsers: 0 }

    // Load interest vectors for all users
    const vectorMap = new Map()
    for (let i = 0; i < allUserIds.length; i += 100) {
        const chunk = allUserIds.slice(i, i + 100)
        const refs = chunk.map(id => dbUsers.collection('analytics_user_interest_vectors').doc(id))
        const docs = await dbUsers.getAll(...refs)
        docs.forEach(doc => {
            if (!doc.exists) return
            const d = doc.data() || {}
            vectorMap.set(doc.id, {
                categoryWeight: d.categoryWeight || {},
                brandWeight: d.brandWeight || {},
                interactionCount: Number(d.interactionCount || 0),
                interactedProductIds: Array.isArray(d.interactedProductIds) ? d.interactedProductIds : [],
            })
        })
    }

    // Load wishlists
    const wishSnap = await dbAdmin.collection('wishlists').get()
    const wishByUser = new Map()
    wishSnap.forEach(doc => {
        const d = doc.data() || {}
        const uid = d.userId
        if (!uid) return
        if (!wishByUser.has(uid)) wishByUser.set(uid, [])
        wishByUser.get(uid).push(d)
    })

    // Load categories for name lookup
    const catSnap = await dbAdmin.collection('categories').get()
    const catNames = new Map()
    catSnap.forEach(doc => catNames.set(doc.id, doc.data()?.name || doc.id))

    // Load products for category lookup from wishlist
    const prodSnap = await dbAdmin.collection('products').limit(500).get()
    const prodCatMap = new Map()
    prodSnap.forEach(doc => {
        const d = doc.data() || {}
        if (d.categoryId) prodCatMap.set(doc.id, d.categoryId)
    })

    // ── Build per-user profile ────────────────────────────────────────────
    const profiles = []
    users.forEach((user, uid) => {
        const vector = vectorMap.get(uid)
        const wishlists = wishByUser.get(uid) || []
        const interactionCount = vector?.interactionCount || 0
        const createdAt = user.createdAt

        // Top categories from interest vector
        const catWeights = Object.entries(vector?.categoryWeight || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id, score]) => ({ id, name: catNames.get(id) || id, score }))

        // Top brands from interest vector
        const brandWeights = Object.entries(vector?.brandWeight || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([brand, score]) => ({ brand, score }))

        // Wishlist category distribution
        const wishCatCounts = new Map()
        wishlists.forEach(w => {
            const catId = prodCatMap.get(w.productId)
            if (catId) wishCatCounts.set(catId, (wishCatCounts.get(catId) || 0) + 1)
        })

        const daysSinceSignup = createdAt
            ? Math.floor((Date.now() - createdAt.getTime()) / 86400000)
            : 999

        profiles.push({
            uid,
            email: user.email,
            name: user.name,
            interactionCount,
            wishlistCount: wishlists.length,
            topCategories: catWeights,
            topBrands: brandWeights,
            wishCatCounts,
            daysSinceSignup,
            isNew: daysSinceSignup <= 7,
            isActive: interactionCount >= 5,
            isHighValue: interactionCount >= 20 || wishlists.length >= 10,
            isDormant: interactionCount === 0 && daysSinceSignup > 30,
        })
    })

    // ── Build segments ────────────────────────────────────────────────────
    const makeSegment = (id, name, description, filter) => {
        const matched = profiles.filter(filter)
        return {
            id,
            name,
            description,
            userCount: matched.length,
            emails: matched.map(p => p.email),
        }
    }

    // Category-based segments (dynamic — one per category that has users)
    const catSegments = []
    catNames.forEach((catName, catId) => {
        const matched = profiles.filter(p =>
            p.topCategories.some(c => c.id === catId && c.score > 1) ||
            (p.wishCatCounts.get(catId) || 0) >= 2
        )
        if (matched.length >= 1) {
            catSegments.push({
                id: `cat_${catId}`,
                name: `${catName} Shoppers`,
                description: `Users interested in ${catName} based on views and wishlists`,
                userCount: matched.length,
                emails: matched.map(p => p.email),
            })
        }
    })

    // Brand-based segments
    const brandMapLocal = new Map()
    profiles.forEach(p => {
        p.topBrands.forEach(({ brand, score }) => {
            if (score < 1) return
            if (!brandMapLocal.has(brand)) brandMapLocal.set(brand, [])
            brandMapLocal.get(brand).push(p)
        })
    })
    const brandSegments = []
    brandMapLocal.forEach((matched, brand) => {
        if (matched.length >= 2) {
            brandSegments.push({
                id: `brand_${normalize(brand).replace(/\s+/g, '_')}`,
                name: `${brand} Fans`,
                description: `Users who frequently interact with ${brand} products`,
                userCount: matched.length,
                emails: matched.map(p => p.email),
            })
        }
    })

    const segments = [
        makeSegment('all', 'All Users', 'Every registered user', () => true),
        makeSegment('new_users', 'New Users (last 7 days)', 'Signed up in the last 7 days', p => p.isNew),
        makeSegment('active', 'Active Users', 'Users with 5+ interactions', p => p.isActive),
        makeSegment('high_value', 'High-Value Users', '20+ interactions or 10+ wishlisted products', p => p.isHighValue),
        makeSegment('dormant', 'Dormant Users', 'No activity, signed up 30+ days ago', p => p.isDormant),
        makeSegment('wishlisters', 'Wishlist Users', 'Users who have wishlisted at least one product', p => p.wishlistCount > 0),
        ...catSegments,
        ...brandSegments,
    ]

    // ── Persist to Firestore (DB-4 Workspace) ─────────────────────────────
    const batch = dbWorkspace.batch()
    const now = new Date()

    // Delete old saved segments
    const oldSnap = await dbWorkspace.collection('mail_audience_segments').get()
    oldSnap.forEach(doc => batch.delete(doc.ref))

    // Write new segments
    for (const seg of segments) {
        const ref = dbWorkspace.collection('mail_audience_segments').doc(seg.id)
        batch.set(ref, { ...seg, updatedAt: now })
    }

    // Save metadata
    const metaRef = dbWorkspace.collection('mail_audience_segments').doc('__meta__')
    batch.set(metaRef, { lastAnalysedAt: now, totalUsers: users.size, segmentCount: segments.length })

    await batch.commit()

    return { segments, totalUsers: users.size, lastAnalysedAt: now.toISOString() }
}

// ── Load cached ──────────────────────────────────────────────────────────────
async function loadCached(includeEmails) {
    const snap = await dbWorkspace.collection('mail_audience_segments').get()
    if (snap.empty) return null // never analysed — trigger fresh

    const segments = []
    let meta = null
    snap.forEach(doc => {
        if (doc.id === '__meta__') {
            const d = doc.data() || {}
            meta = { lastAnalysedAt: d.lastAnalysedAt?.toDate?.()?.toISOString() || null, totalUsers: d.totalUsers || 0 }
            return
        }
        const d = doc.data() || {}
        segments.push({
            id: d.id || doc.id,
            name: d.name || '',
            description: d.description || '',
            userCount: d.userCount || 0,
            ...(includeEmails ? { emails: d.emails || [] } : {}),
        })
    })

    return { segments, ...(meta || { totalUsers: 0 }), cached: true }
}

export async function GET(req) {
    if (!dbAdmin || !dbWorkspace || !dbUsers) return NextResponse.json({ error: 'Databases not initialized' }, { status: 500 })
    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'notifications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const url = new URL(req.url)
        const includeEmails = url.searchParams.get('emails') === 'true'
        const forceRefresh = url.searchParams.get('refresh') === 'true'

        if (forceRefresh) {
            const result = await analyseAndPersist()
            // strip emails unless requested
            if (!includeEmails) {
                result.segments = result.segments.map(({ emails, ...rest }) => rest)
            }
            return NextResponse.json(result)
        }

        // Try cached first
        const cached = await loadCached(includeEmails)
        if (cached) return NextResponse.json(cached)

        // First time — run full analysis
        const result = await analyseAndPersist()
        if (!includeEmails) {
            result.segments = result.segments.map(({ emails, ...rest }) => rest)
        }
        return NextResponse.json(result)
    } catch (err) {
        console.error('[mail/audience]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(req) {
    if (!dbAdmin || !dbWorkspace || !dbUsers) return NextResponse.json({ error: 'Databases not initialized' }, { status: 500 })
    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'notifications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const result = await analyseAndPersist()
        // Don't return emails in the response for POST (just confirmation)
        result.segments = result.segments.map(({ emails, ...rest }) => rest)
        return NextResponse.json({ success: true, ...result })
    } catch (err) {
        console.error('[mail/audience] POST', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
