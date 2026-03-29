import { NextResponse } from 'next/server'

// DELETE /api/wishlist/[productId]
export async function DELETE(req, { params }) {
    const { productId } = await params
    // TODO: Wishlist.delete({ where: { userId_productId: { userId, productId } } })
    return NextResponse.json({ success: true })
}
