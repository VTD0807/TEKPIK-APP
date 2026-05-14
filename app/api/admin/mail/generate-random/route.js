/**
 * POST /api/admin/mail/generate-random
 * Generate random/realistic values for template variables using real Firestore data.
 *
 * Body: { variables: string[], templateId?: string }
 * Returns: { values: { [variable]: string } }
 */
import { NextResponse } from 'next/server'
import { dbWorkspace, getProductionDb, dbAdmin } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

// ── Static fallback pools ──────────────────────────────────────────────────────
const FALLBACK_NAMES = ['Aisha Sharma', 'Rohan Mehta', 'Priya Nair', 'Vikram Singh', 'Neha Patel', 'Arjun Reddy', 'Kavya Iyer', 'Siddharth Joshi', 'Ananya Bose', 'Karthik Rajan']
const FALLBACK_PRODUCTS = ['Noise-Cancelling Headphones', 'Wireless Earbuds Pro', 'Gaming Mechanical Keyboard', 'USB-C Hub Multiport', 'Smart Fitness Tracker', 'Portable Bluetooth Speaker', 'RGB Gaming Mouse', '4K Webcam Deluxe', 'Fast-Charge Power Bank', 'LED Desk Lamp RGB']
const FALLBACK_CATEGORIES = ['Electronics', 'Accessories', 'Gaming', 'Audio', 'Smart Devices', 'Peripherals']
const FALLBACK_PRICES = ['₹1,299', '₹2,499', '₹4,999', '₹799', '₹3,299', '₹1,899', '₹5,999', '₹649', '₹2,199', '₹899']
const FALLBACK_EMAILS = ['user@example.com', 'shopper@tekpik.in', 'buyer@example.com']
const FALLBACK_ORDERS = ['TK-20248821', 'TK-20247734', 'TK-20243301', 'TK-20249012', 'TK-20245567']
const FALLBACK_CODES = ['SAVE20', 'TEKPIK15', 'NEWUSER10', 'FLASH30', 'VIP25']

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const fmtPrice = (n) => `₹${Number(n).toLocaleString('en-IN')}`

// Variable-name mapping to generators
const VARIABLE_GENERATORS = {
    // User fields
    name:           (ctx) => ctx.randomName,
    user_name:      (ctx) => ctx.randomName,
    username:       (ctx) => ctx.randomName,
    first_name:     (ctx) => ctx.randomName.split(' ')[0],
    email:          (ctx) => ctx.randomEmail,
    user_email:     (ctx) => ctx.randomEmail,

    // Product fields
    product_title:  (ctx) => ctx.randomProduct,
    product_name:   (ctx) => ctx.randomProduct,
    product:        (ctx) => ctx.randomProduct,
    title:          (ctx) => ctx.randomProduct,
    product_price:  (ctx) => ctx.randomPrice,
    price:          (ctx) => ctx.randomPrice,
    original_price: (ctx) => ctx.randomPrice,
    category:       (ctx) => ctx.randomCategory,
    product_category:(ctx) => ctx.randomCategory,
    product_url:    (ctx) => `https://tekpik.in/products/${Math.floor(Math.random()*9000+1000)}`,
    product_image:  (ctx) => 'https://tekpik.in/placeholder.jpg',

    // Order fields
    order_id:       () => pick(FALLBACK_ORDERS),
    order_number:   () => pick(FALLBACK_ORDERS),
    order_total:    (ctx) => ctx.randomPrice,
    order_status:   () => pick(['Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Pending']),
    tracking_id:    () => `IND${Math.floor(Math.random()*9000000+1000000)}`,

    // Promo fields
    promo_code:     () => pick(FALLBACK_CODES),
    coupon_code:    () => pick(FALLBACK_CODES),
    discount:       () => `${pick([10,15,20,25,30])}%`,
    discount_amount:(ctx) => ctx.randomPrice,
    offer:          () => `Up to ${pick([20,30,40,50])}% off`,

    // App fields
    app_name:       () => 'TekPik',
    brand:          () => 'TekPik',
    site_url:       () => 'https://tekpik.in',
    support_email:  () => 'support@tekpik.in',
    year:           () => new Date().getFullYear().toString(),
    date:           () => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    review_link:    () => `https://tekpik.in/review/${Math.floor(Math.random()*9000+1000)}`,
    cta_url:        () => 'https://tekpik.in/products',
    cta_label:      () => 'Shop Now →',
    subject:        () => 'Special offer just for you!',
    unsubscribe_url:() => 'https://tekpik.in/unsubscribe',

    // Wishlist
    wishlist_count: () => String(Math.floor(Math.random() * 10 + 1)),
    items_count:    () => String(Math.floor(Math.random() * 5 + 1)),

    // Delivery / return fields
    delivery_date:  () => {
        const d = new Date(); d.setDate(d.getDate() + Math.floor(Math.random()*5+2))
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    },
    return_deadline:() => {
        const d = new Date(); d.setDate(d.getDate() + 7)
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    },

    // Review fields
    rating:         () => `${pick([3,4,5])}/5`,
    review_comment: () => pick(['Great product!', 'Value for money.', 'Excellent quality.', 'Fast delivery!', 'Would recommend.']),
    rejection_reason:() => pick(['Content violates policy', 'Inappropriate language', 'Spam content', 'Duplicate review']),
}

export async function POST(req) {
    const ctx = await getAccessContext(req)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    if (!hasAdminAccess(ctx, 'notifications')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const variables = Array.isArray(body.variables) ? body.variables : []

    if (!variables.length) {
        return NextResponse.json({ values: {} })
    }

    // ── Fetch real data from Firestore for richer context ─────────────────────
    let randomName = pick(FALLBACK_NAMES)
    let randomEmail = pick(FALLBACK_EMAILS)
    let randomProduct = pick(FALLBACK_PRODUCTS)
    let randomPrice = pick(FALLBACK_PRICES)
    let randomCategory = pick(FALLBACK_CATEGORIES)

    try {
        const prodDb = await getProductionDb() || dbAdmin

        // Fetch a random product
        const needsProduct = variables.some(v =>
            ['product_title', 'product_name', 'product', 'title', 'product_price', 'price', 'original_price', 'category', 'product_category'].includes(v.toLowerCase())
        )
        if (needsProduct && prodDb) {
            try {
                const snap = await prodDb.collection('products').limit(50).get()
                const docs = snap.docs.filter(d => d.data().name || d.data().title)
                if (docs.length) {
                    const doc = pick(docs).data()
                    randomProduct = doc.name || doc.title || randomProduct
                    if (doc.price) randomPrice = fmtPrice(doc.price)
                    if (doc.category) randomCategory = doc.category
                }
            } catch { /* use fallback */ }
        }

        // Fetch a random user
        const needsUser = variables.some(v =>
            ['name', 'user_name', 'username', 'first_name', 'email', 'user_email'].includes(v.toLowerCase())
        )
        if (needsUser && prodDb) {
            try {
                const snap = await prodDb.collection('users').limit(50).get()
                const docs = snap.docs.filter(d => d.data().name || d.data().displayName)
                if (docs.length) {
                    const doc = pick(docs).data()
                    randomName = doc.name || doc.displayName || randomName
                    randomEmail = doc.email || randomEmail
                }
            } catch { /* use fallback */ }
        }
    } catch { /* silently use fallback data */ }

    // ── Build context for generators ─────────────────────────────────────────
    const genCtx = { randomName, randomEmail, randomProduct, randomPrice, randomCategory }

    // ── Generate values for each requested variable ────────────────────────────
    const values = {}
    for (const v of variables) {
        const key = v.toLowerCase()
        const generator = VARIABLE_GENERATORS[key]
        values[v] = generator ? generator(genCtx) : `[${v}]`
    }

    return NextResponse.json({ values })
}
