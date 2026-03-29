import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
        .from('products')
        .select('*, categories(name,slug), ai_analysis(*), reviews(id,author_name,rating,title,body,pros,cons,is_verified,helpful,created_at)')
        .eq('id', id)
        .eq('reviews.is_approved', true)
        .single()

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
}
