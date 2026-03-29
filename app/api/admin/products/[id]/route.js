import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function PUT(req, { params }) {
    const { id } = await params
    const supabase = await createSupabaseServerClient()
    const body = await req.json()

    const { data, error } = await supabase.from('products').update({
        title: body.title,
        description: body.description,
        price: parseFloat(body.price),
        original_price: body.originalPrice ? parseFloat(body.originalPrice) : null,
        discount: parseInt(body.discount) || 0,
        affiliate_url: body.affiliateUrl,
        asin: body.asin || null,
        brand: body.brand || '',
        image_urls: Array.isArray(body.imageUrls) ? body.imageUrls : body.imageUrls?.split(',').map(s => s.trim()).filter(Boolean) || [],
        is_featured: body.isFeatured || false,
        is_active: body.isActive ?? true,
    }).eq('id', id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ product: data })
}

export async function DELETE(req, { params }) {
    const { id } = await params
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
