import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/wishlist?userId=xxx
export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ wishlist: [] })

    const wishlist = await prisma.wishlist.findMany({
        where: { userId },
        include: {
            product: {
                include: { aiAnalysis: { select: { score: true } } },
            },
        },
        orderBy: { addedAt: 'desc' },
    })

    return NextResponse.json({ wishlist: wishlist.map(w => w.product) })
}

// POST /api/wishlist  — toggle (add if not exists, remove if exists)
export async function POST(req) {
    const { userId, productId } = await req.json()
    if (!userId || !productId) return NextResponse.json({ error: 'userId and productId required' }, { status: 400 })

    const existing = await prisma.wishlist.findUnique({
        where: { userId_productId: { userId, productId } },
    })

    if (existing) {
        await prisma.wishlist.delete({ where: { userId_productId: { userId, productId } } })
        return NextResponse.json({ saved: false })
    } else {
        await prisma.wishlist.create({ data: { userId, productId } })
        return NextResponse.json({ saved: true })
    }
}
