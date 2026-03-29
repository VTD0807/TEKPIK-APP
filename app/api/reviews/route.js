import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ reviews: data })
}

export async function POST(req) {
    const body = await req.json()
    const { productId, rating, authorName, title, body: reviewBody, pros = [], cons = [] } = body

    if (!productId || !rating || !authorName || !title || !reviewBody)
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    if (reviewBody.length < 50)
        return NextResponse.json({ error: 'Review must be at least 50 characters' }, { status: 400 })

    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.from('reviews').insert({
        product_id: productId,
        rating: parseInt(rating),
        author_name: authorName,
        title,
        body: reviewBody,
        pros,
        cons,
        is_approved: false,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, review: data }, { status: 201 })
}
