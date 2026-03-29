import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateProductAnalysis } from '@/lib/openrouter'

// GET /api/ai/analyse?productId=xxx
export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

    const analysis = await prisma.aiAnalysis.findUnique({ where: { productId } })
    return NextResponse.json({ analysis })
}

// POST /api/ai/analyse  — admin only
export async function POST(req) {
    const { productId } = await req.json()
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { category: true },
    })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const result = await generateProductAnalysis({
        title: product.title,
        description: product.description,
        brand: product.brand,
        price: product.price,
        category: product.category?.name || '',
    })

    const analysis = await prisma.aiAnalysis.upsert({
        where: { productId },
        create: { productId, ...result },
        update: { ...result, updatedAt: new Date() },
    })

    return NextResponse.json({ analysis })
}
