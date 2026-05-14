import { NextResponse } from 'next/server'
import { getProductDetail } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
    const { id } = await params

    try {
        const product = await getProductDetail(id)
        if (!product) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        return NextResponse.json(product)
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
