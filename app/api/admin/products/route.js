import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/products
export async function GET() {
    const products = await prisma.product.findMany({
        include: {
            category: true,
            aiAnalysis: { select: { score: true, generatedAt: true } },
            _count: { select: { reviews: true, wishlists: true } },
        },
        orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ products })
}

// POST /api/admin/products
export async function POST(req) {
    const body = await req.json()
    const { title, description, price, originalPrice, discount, affiliateUrl, asin, brand, imageUrls, isFeatured, categoryId, tags, slug } = body

    const product = await prisma.product.create({
        data: { title, slug: slug || title.toLowerCase().replace(/\s+/g, '-'), description, price, originalPrice, discount: discount || 0, affiliateUrl, asin, brand: brand || '', imageUrls: imageUrls || [], isFeatured: isFeatured || false, categoryId, tags: tags || [] },
    })

    return NextResponse.json({ product }, { status: 201 })
}
