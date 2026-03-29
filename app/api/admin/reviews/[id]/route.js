import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/admin/reviews/[id]  — approve / reject / verify
export async function PATCH(req, { params }) {
    const { id } = await params
    const { action } = await req.json()

    const data = action === 'approve' ? { isApproved: true }
        : action === 'reject' ? { isApproved: false }
        : action === 'verify' ? { isVerified: true }
        : {}

    const review = await prisma.review.update({ where: { id }, data })
    return NextResponse.json({ review })
}

// DELETE /api/admin/reviews/[id]
export async function DELETE(req, { params }) {
    const { id } = await params
    await prisma.review.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
