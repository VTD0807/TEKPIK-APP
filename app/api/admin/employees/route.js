import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

export async function GET(req) {
    if (!dbAdmin) return NextResponse.json({ employees: [], summary: {} })

    const accessCtx = await getAccessContext(req)
    if (!accessCtx.ok) {
        return NextResponse.json({ error: accessCtx.error }, { status: accessCtx.status })
    }
    if (!hasAdminAccess(accessCtx, 'employees')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        // Fetch all users
        const usersSnap = await dbAdmin.collection('users').get()
        const users = []
        
        usersSnap.forEach(doc => {
            const data = doc.data()
            const normalizedRole = String(data.role || 'USER').trim().toUpperCase()
            const normalizedTags = normalizeList(data.tags || data.employeeTags)
            const normalizedSectors = normalizeList(data.sectors)
            const normalizedAccess = normalizeDashboardAccess(data.dashboardAccess)
            users.push({
                id: doc.id,
                name: data.name || 'Unknown',
                email: data.email || '',
                image: data.image || '',
                role: normalizedRole,
                tags: normalizedTags,
                sectors: normalizedSectors,
                dashboardAccess: normalizedAccess,
                employeeAccess: deriveEmployeeAccess({
                    employeeAccess: data.employeeAccess,
                    role: normalizedRole,
                    tags: normalizedTags,
                    sectors: normalizedSectors,
                    dashboardAccess: normalizedAccess,
                }),
                createdAt: data.createdAt ? timestampToJSON(data.createdAt) : new Date().toISOString(),
                lastSeenAt: data.lastSeenAt ? timestampToJSON(data.lastSeenAt) : null,
            })
        })

        const employeeUsers = users.filter((user) => {
            if (user.role === 'ADMIN') return false
            return Boolean(user.employeeAccess) || isEmployeeRole(user.role)
        })

        // Fetch all products with creator info
        const productsSnap = await dbAdmin.collection('products').get()
        const productsByUser = {}
        const allProducts = []

        productsSnap.forEach(doc => {
            const data = doc.data()
            const creatorId = data.createdBy || data.creator_id || null
            
            allProducts.push({
                id: doc.id,
                title: data.title || 'Untitled',
                imageUrl: data.imageUrls?.[0] || data.image_urls?.[0] || null,
                price: data.price || 0,
                isActive: data.isActive ?? data.is_active ?? data.public ?? true,
                createdAt: data.createdAt ? timestampToJSON(data.createdAt) : null,
                createdBy: creatorId,
                views: data.views || 0,
                brand: data.brand || '',
            })

            if (creatorId) {
                if (!productsByUser[creatorId]) {
                    productsByUser[creatorId] = []
                }
                productsByUser[creatorId].push({
                    id: doc.id,
                    title: data.title || 'Untitled',
                    imageUrl: data.imageUrls?.[0] || data.image_urls?.[0] || null,
                    price: data.price || 0,
                    isActive: data.isActive ?? data.is_active ?? data.public ?? true,
                    createdAt: data.createdAt ? timestampToJSON(data.createdAt) : null,
                    views: data.views || 0,
                })
            }
        })

        // Aggregate unique-device views from the analytics collection used elsewhere in the app.
        const viewCountsSnap = await dbAdmin.collection('analytics_product_view_counts').get()
        const viewsByProduct = {}
        viewCountsSnap.forEach(doc => {
            const data = doc.data() || {}
            viewsByProduct[doc.id] = data.uniqueDeviceViews || 0
        })

        Object.keys(viewsByProduct).forEach(productId => {
            const count = viewsByProduct[productId] || 0
            const product = allProducts.find(item => item.id === productId)
            if (product) {
                product.views = count
            }
            const ownerId = product?.createdBy
            if (ownerId && productsByUser[ownerId]) {
                const ownedProduct = productsByUser[ownerId].find(item => item.id === productId)
                if (ownedProduct) {
                    ownedProduct.views = count
                }
            }
        })

        // Fetch reviews and analytics
        const reviewsSnap = await dbAdmin.collection('reviews').get()
        const reviewsByUser = {}
        const allReviews = []

        reviewsSnap.forEach(doc => {
            const data = doc.data()
            const userId = data.userId || data.user_id || null
            
            allReviews.push({
                id: doc.id,
                productId: data.productId || data.product_id || null,
                userId: userId,
                rating: data.rating || 0,
                isApproved: data.isApproved || false,
                createdAt: data.createdAt ? timestampToJSON(data.createdAt) : null,
            })

            if (userId) {
                if (!reviewsByUser[userId]) {
                    reviewsByUser[userId] = []
                }
                reviewsByUser[userId].push({
                    id: doc.id,
                    productId: data.productId || data.product_id || null,
                    rating: data.rating || 0,
                    isApproved: data.isApproved || false,
                    createdAt: data.createdAt ? timestampToJSON(data.createdAt) : null,
                })
            }
        })

        // Build employee analytics
        const employees = employeeUsers.map(user => {
            const userProducts = productsByUser[user.id] || []
            const userReviews = reviewsByUser[user.id] || []
            const activeProducts = userProducts.filter(p => p.isActive).length
            const totalViews = userProducts.reduce((sum, p) => sum + (p.views || 0), 0)
            const approvedReviews = userReviews.filter(r => r.isApproved).length
            const avgRating = userReviews.length > 0 
                ? (userReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / userReviews.length).toFixed(1) 
                : 0

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role,
                createdAt: user.createdAt,
                lastSeenAt: user.lastSeenAt,
                stats: {
                    productsAdded: userProducts.length,
                    activeProducts: activeProducts,
                    totalViews: totalViews,
                    reviewsSubmitted: userReviews.length,
                    reviewsApproved: approvedReviews,
                    avgRating: parseFloat(avgRating),
                    performanceScore: calculatePerformanceScore(userProducts.length, activeProducts, totalViews, approvedReviews),
                },
                workHistory: {
                    products: userProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
                    reviews: userReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
                }
            }
        }).sort((a, b) => b.stats.performanceScore - a.stats.performanceScore)

        // Calculate summary by role
        const roleStats = {}
        employees.forEach(emp => {
            if (!roleStats[emp.role]) {
                roleStats[emp.role] = {
                    count: 0,
                    totalProducts: 0,
                    avgProducts: 0,
                    totalViews: 0,
                    avgViews: 0,
                    totalReviews: 0,
                    avgReviews: 0,
                    avgPerformanceScore: 0,
                }
            }
            roleStats[emp.role].count++
            roleStats[emp.role].totalProducts += emp.stats.productsAdded
            roleStats[emp.role].totalViews += emp.stats.totalViews
            roleStats[emp.role].totalReviews += emp.stats.reviewsSubmitted
            roleStats[emp.role].avgPerformanceScore += emp.stats.performanceScore
        })

        Object.keys(roleStats).forEach(role => {
            const stats = roleStats[role]
            stats.avgProducts = (stats.totalProducts / stats.count).toFixed(1)
            stats.avgViews = (stats.totalViews / stats.count).toFixed(0)
            stats.avgReviews = (stats.totalReviews / stats.count).toFixed(1)
            stats.avgPerformanceScore = (stats.avgPerformanceScore / stats.count).toFixed(0)
        })

        return NextResponse.json({
            employees,
            roleStats,
            summary: {
                totalEmployees: employeeUsers.length,
                totalProducts: employees.reduce((sum, item) => sum + item.stats.productsAdded, 0),
                totalReviews: employees.reduce((sum, item) => sum + item.stats.reviewsSubmitted, 0),
                avgProductsPerEmployee: employeeUsers.length > 0
                    ? (employees.reduce((sum, item) => sum + item.stats.productsAdded, 0) / employeeUsers.length).toFixed(1)
                    : 0,
                avgReviewsPerEmployee: employeeUsers.length > 0
                    ? (employees.reduce((sum, item) => sum + item.stats.reviewsSubmitted, 0) / employeeUsers.length).toFixed(1)
                    : 0,
            }
        })
    } catch (error) {
        console.error('[admin-employees]', error)
        return NextResponse.json({ employees: [], summary: {}, error: error.message }, { status: 500 })
    }
}

function calculatePerformanceScore(productsAdded, activeProducts, totalViews, approvedReviews) {
    let score = 0
    
    // Product contribution (base: 0-40 points)
    if (productsAdded > 0) {
        score += Math.min(40, productsAdded * 5)
    }
    
    // Product quality (base: 0-20 points)
    if (productsAdded > 0) {
        const activeRate = (activeProducts / productsAdded) * 100
        score += (activeRate / 100) * 20
    }
    
    // Views impact (base: 0-25 points)
    if (totalViews > 0) {
        score += Math.min(25, (totalViews / 100) * 2)
    }
    
    // Review contributions (base: 0-15 points)
    score += Math.min(15, approvedReviews * 2)
    
    return Math.round(score)
}

function normalizeList(value) {
    if (Array.isArray(value)) {
        return value.map(item => String(item).trim()).filter(Boolean)
    }
    if (typeof value === 'string') {
        return value.split(',').map(item => item.trim()).filter(Boolean)
    }
    return []
}

function normalizeDashboardAccess(value = {}) {
    const source = value && typeof value === 'object' ? value : {}
    return {
        cms: Boolean(source.cms),
        admin: Boolean(source.admin),
        store: Boolean(source.store),
        analytics: Boolean(source.analytics),
        users: Boolean(source.users),
        employees: Boolean(source.employees),
        reviews: Boolean(source.reviews),
        products: Boolean(source.products),
        notifications: Boolean(source.notifications),
        settings: Boolean(source.settings),
    }
}

function deriveEmployeeAccess({ employeeAccess, role, tags, sectors, dashboardAccess }) {
    if (isEmployeeRole(role)) return true
    if (typeof employeeAccess === 'boolean') return employeeAccess

    const normalizedRole = String(role || 'USER').trim().toUpperCase()
    if (normalizedRole === 'ADMIN') return false
    // Legacy fallback only.
    return isEmployeeRole(normalizedRole)
}

function isEmployeeRole(role) {
    const normalizedRole = String(role || 'USER').trim().toUpperCase()
    return ['MANAGER', 'EDITOR', 'SUPPORT', 'EMPLOYEE'].includes(normalizedRole)
}
