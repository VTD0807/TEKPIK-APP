import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function PUT(req, { params }) {
    const { id } = await params
    const supabase = await createSupabaseServerClient()
    const body = await req.json()
    const { data, error } = await supabase
        .from('categories')
        .update({ name: body.name, slug: body.slug, icon: body.icon, description: body.description })
        .eq('id', id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function DELETE(req, { params }) {
    const { id } = await params
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
