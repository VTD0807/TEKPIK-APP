import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/admin/products/[id]
export async function PUT(req, { params }) {
    const { id } = await params
    const body = await req.json()
    const product = await prisma.product.update({ where: { id }, data: body })
    return NextResponse.json({ product })
}

// DELETE /api/admin/products/[id]
export async function DELETE(req, { params }) {
    const { id } = await params
    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
