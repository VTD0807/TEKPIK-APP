import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured')
    const sort = searchParams.get('sort') || 'newest'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')

    const supabase = await createSupabaseServerClient()

    let query = supabase
        .from('products')
        .select('*, categories(name,slug,icon), ai_analysis(score,value_for_money)', { count: 'exact' })
        .eq('is_active', true)

    if (category) query = query.eq('categories.slug', category)
    if (featured === 'true') query = query.eq('is_featured', true)
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,brand.ilike.%${search}%`)

    if (sort === 'price_asc') query = query.order('price', { ascending: true })
    else if (sort === 'price_desc') query = query.order('price', { ascending: false })
    else query = query.order('created_at', { ascending: false })

    query = query.range((page - 1) * limit, page * limit - 1)

    const { data, count, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ products: data, total: count, page, pages: Math.ceil((count || 0) / limit) })
}
