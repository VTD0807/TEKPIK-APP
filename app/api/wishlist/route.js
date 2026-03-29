import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ wishlist: [] })

    const { data } = await supabase
        .from('wishlists')
        .select('product_id, products(*, ai_analysis(score))')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false })

    return NextResponse.json({ wishlist: data?.map(w => w.products) || [] })
}

export async function POST(req) {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { productId } = await req.json()
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

    const { data: existing } = await supabase
        .from('wishlists')
        .select('product_id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single()

    if (existing) {
        await supabase.from('wishlists').delete().eq('user_id', user.id).eq('product_id', productId)
        return NextResponse.json({ saved: false })
    } else {
        await supabase.from('wishlists').insert({ user_id: user.id, product_id: productId })
        return NextResponse.json({ saved: true })
    }
}
