import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req, { params }) {
    const { id } = await params

    const product = await prisma.product.findUnique({
        where: { id },
        include: {
            category: true,
            aiAnalysis: true,
            reviews: {
                where: { isApproved: true },
                orderBy: { createdAt: 'desc' },
            },
        },
    })

    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(product)
}
