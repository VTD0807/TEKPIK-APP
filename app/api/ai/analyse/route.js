import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { generateProductAnalysis } from '@/lib/openrouter'

export const dynamic = 'force-dynamic'

export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.from('ai_analysis').select('*').eq('product_id', productId).single()
    return NextResponse.json({ analysis: data })
}

export async function POST(req) {
    const { productId } = await req.json()
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

    const supabase = await createSupabaseServerClient()

    const { data: product, error: pErr } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('id', productId)
        .single()

    if (pErr || !product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    try {
        const result = await generateProductAnalysis({
            title: product.title,
            description: product.description,
            brand: product.brand,
            price: product.price,
            category: product.categories?.name || '',
        })

        const { data: analysis, error } = await supabase.from('ai_analysis').upsert({
            product_id: productId,
            summary: result.summary,
            pros: result.pros,
            cons: result.cons,
            who_is_it_for: result.whoIsItFor,
            verdict: result.verdict,
            score: result.score,
            score_reason: result.scoreReason,
            value_for_money: result.valueForMoney,
            model: result.model,
        }, { onConflict: 'product_id' }).select().single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ analysis })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
