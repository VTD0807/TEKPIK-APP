import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/reviews?productId=xxx
export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

    const reviews = await prisma.review.findMany({
        where: { productId, isApproved: true },
        orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ reviews })
}

// POST /api/reviews
export async function POST(req) {
    const body = await req.json()
    const { productId, rating, authorName, title, body: reviewBody, pros = [], cons = [] } = body

    if (!productId || !rating || !authorName || !title || !reviewBody) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (reviewBody.length < 50) {
        return NextResponse.json({ error: 'Review must be at least 50 characters' }, { status: 400 })
    }

    const review = await prisma.review.create({
        data: { productId, rating: parseInt(rating), authorName, title, body: reviewBody, pros, cons, isApproved: false },
    })

    return NextResponse.json({ success: true, review }, { status: 201 })
}
