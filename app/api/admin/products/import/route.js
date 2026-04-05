import { NextResponse } from 'next/server'
import { dbAdmin, authAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { buildProductFeatureVector } from '@/lib/recommendation-features'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const accessCtx = await getAccessContext(req)
    if (!accessCtx.ok) {
        return NextResponse.json({ error: accessCtx.error }, { status: accessCtx.status })
    }
    if (!hasAdminAccess(accessCtx, 'products')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const csvText = String(body?.csvText || '').trim()
        if (!csvText) {
            return NextResponse.json({ error: 'csvText required' }, { status: 400 })
        }

        const rows = parseCsv(csvText)
        if (rows.length === 0) {
            return NextResponse.json({ error: 'No product rows found' }, { status: 400 })
        }

        const categoriesSnap = await dbAdmin.collection('categories').get()
        const categoryLookup = new Map()
        categoriesSnap.forEach((doc) => {
            const data = doc.data() || {}
            const names = [doc.id, data.name, data.slug, data.title]
                .filter(Boolean)
                .map((value) => String(value).trim().toLowerCase())
            names.forEach((value) => categoryLookup.set(value, doc.id))
        })

        let created = 0
        const errors = []
        const createdProducts = []

        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index]
            try {
                const product = await createProductFromRow(row, {
                    createdBy: accessCtx.uid,
                    categoryLookup,
                })
                created += 1
                createdProducts.push(product)
            } catch (error) {
                errors.push({ row: index + 2, error: error.message })
            }
        }

        return NextResponse.json({
            success: true,
            created,
            failed: errors.length,
            errors,
            products: createdProducts.map((product) => ({
                ...product,
                createdAt: timestampToJSON(product.createdAt),
                updatedAt: timestampToJSON(product.updatedAt),
            })),
        })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

function parseCsv(text) {
    const lines = []
    let current = ''
    let row = []
    let inQuotes = false

    const pushCell = () => {
        row.push(current)
        current = ''
    }

    const pushRow = () => {
        if (row.some((value) => String(value).trim() !== '')) {
            lines.push(row)
        }
        row = []
    }

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i]
        const nextChar = text[i + 1]

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"'
                i += 1
            } else {
                inQuotes = !inQuotes
            }
            continue
        }

        if (char === ',' && !inQuotes) {
            pushCell()
            continue
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i += 1
            }
            pushCell()
            pushRow()
            continue
        }

        current += char
    }

    pushCell()
    pushRow()

    if (lines.length === 0) return []

    const headers = lines[0].map((header) => normalizeHeader(header))
    return lines.slice(1).map((columns) => {
        const rowObject = {}
        headers.forEach((header, index) => {
            rowObject[header] = (columns[index] ?? '').trim()
        })
        return rowObject
    }).filter((rowObject) => Object.values(rowObject).some((value) => String(value).trim() !== ''))
}

async function createProductFromRow(row, { createdBy, categoryLookup }) {
    const title = String(row.title || row.name || '').trim()
    if (!title) throw new Error('title required')

    const price = Number.parseFloat(row.price)
    if (!Number.isFinite(price)) throw new Error(`invalid price for ${title}`)

    const affiliateUrl = String(row.affiliateurl || row.affiliate_url || row.affiliate || '').trim()
    if (!affiliateUrl) throw new Error(`affiliateUrl required for ${title}`)

    const categoryId = resolveCategoryId(row, categoryLookup)
    if (!categoryId) throw new Error(`categoryId required for ${title}`)

    const now = new Date()
    const resolvedSlug = String(row.slug || title).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const parsedOriginalPrice = parseOptionalNumber(row.originalprice || row.original_price)
    const parsedDiscount = parseOptionalNumber(row.discount || row.discount_percentage, 0)
    const product = {
        title,
        slug: resolvedSlug,
        description: String(row.description || '').trim(),
        price,
        originalPrice: parsedOriginalPrice,
        discount: parsedDiscount,
        affiliateUrl,
        asin: String(row.asin || '').trim() || null,
        brand: String(row.brand || '').trim(),
        imageUrls: parseList(row.imageurls || row.image_urls || row.images || row.imageurl),
        isFeatured: parseBoolean(row.isfeatured || row.is_featured),
        isActive: parseBoolean(row.isactive ?? row.is_active ?? row.public ?? row.ispublic, true),
        categoryId,
        tags: parseList(row.tags),
        affiliate_url: affiliateUrl,
        image_urls: parseList(row.imageurls || row.image_urls || row.images || row.imageurl),
        original_price: parsedOriginalPrice,
        category_id: categoryId,
        is_featured: parseBoolean(row.isfeatured || row.is_featured),
        is_active: parseBoolean(row.isactive ?? row.is_active ?? row.public ?? row.ispublic, true),
        public: parseBoolean(row.isactive ?? row.is_active ?? row.public ?? row.ispublic, true),
        createdAt: now,
        updatedAt: now,
        ...(createdBy && { createdBy }),
    }

    const docRef = await dbAdmin.collection('products').add(product)
    await dbAdmin.collection('analytics_product_feature_vectors').doc(docRef.id).set({
        productId: docRef.id,
        features: buildProductFeatureVector({ id: docRef.id, ...product }),
        updatedAt: now,
    }, { merge: true })

    const docSnap = await docRef.get()
    return {
        id: docSnap.id,
        ...docSnap.data(),
    }
}

function resolveCategoryId(row, categoryLookup) {
    const rawCategoryId = String(row.categoryid || row.category_id || '').trim()
    if (rawCategoryId) return rawCategoryId

    const rawCategory = String(row.category || row.categoryname || '').trim().toLowerCase()
    if (!rawCategory) return ''
    return categoryLookup.get(rawCategory) || ''
}

function parseBoolean(value, fallback = false) {
    if (value === true || value === false) return value
    const normalized = String(value ?? '').trim().toLowerCase()
    if (!normalized) return fallback
    return ['true', '1', 'yes', 'y', 'active', 'featured'].includes(normalized)
}

function parseOptionalNumber(value, fallback = null) {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

function parseList(value) {
    return String(value || '')
        .split(/[;,|]/)
        .map((item) => item.trim())
        .filter(Boolean)
}

function normalizeHeader(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
}