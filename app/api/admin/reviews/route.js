import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/reviews?status=pending|approved|all
export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'all'

    const where = status === 'pending' ? { isApproved: false }
        : status === 'approved' ? { isApproved: true }
        : {}

    const reviews = await prisma.review.findMany({
        where,
        include: { product: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ reviews })
}
