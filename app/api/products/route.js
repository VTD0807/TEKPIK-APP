import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/products?category=&search=&featured=&sort=&page=&limit=
export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured')
    const sort = searchParams.get('sort') || 'newest'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')

    const where = {
        isActive: true,
        ...(category && { category: { slug: category } }),
        ...(featured === 'true' && { isFeatured: true }),
        ...(search && {
            OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { brand: { contains: search, mode: 'insensitive' } },
            ],
        }),
    }

    const orderBy = sort === 'price_asc' ? { price: 'asc' }
        : sort === 'price_desc' ? { price: 'desc' }
        : { createdAt: 'desc' }

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                category: true,
                aiAnalysis: { select: { score: true, valueForMoney: true } },
                _count: { select: { reviews: { where: { isApproved: true } } } },
            },
        }),
        prisma.product.count({ where }),
    ])

    return NextResponse.json({ products, total, page, pages: Math.ceil(total / limit) })
}
