import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient()
        const { data, error } = await supabase
            .from('categories')
            .select('*, products(count)')
            .order('name')

        if (error) throw error

        const categories = (data || []).map(c => ({
            ...c,
            products: c.products?.[0]?.count ?? 0,
        }))

        return NextResponse.json(categories)
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(req) {
    try {
        const supabase = await createSupabaseServerClient()
        const body = await req.json()
        const { data, error } = await supabase
            .from('categories')
            .insert({ name: body.name, slug: body.slug, icon: body.icon || '🛍️', description: body.description || '' })
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data, { status: 201 })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
