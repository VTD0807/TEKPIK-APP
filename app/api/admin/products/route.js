import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
        .from('products')
        .select('*, categories(name,slug), ai_analysis(score,generated_at)')
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ products: data })
}

export async function POST(req) {
    const supabase = await createSupabaseServerClient()
    const body = await req.json()

    const { data, error } = await supabase.from('products').insert({
        title: body.title,
        slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: body.description || '',
        price: parseFloat(body.price),
        original_price: body.originalPrice ? parseFloat(body.originalPrice) : null,
        discount: parseInt(body.discount) || 0,
        affiliate_url: body.affiliateUrl,
        asin: body.asin || null,
        brand: body.brand || '',
        image_urls: body.imageUrls || [],
        is_featured: body.isFeatured || false,
        is_active: body.isActive ?? true,
        category_id: body.categoryId || null,
        tags: body.tags || [],
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ product: data }, { status: 201 })
}
