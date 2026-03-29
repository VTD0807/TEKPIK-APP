import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function PATCH(req, { params }) {
    const { id } = await params
    const { action } = await req.json()
    const supabase = await createSupabaseServerClient()

    const update = action === 'approve' ? { is_approved: true }
        : action === 'reject' ? { is_approved: false }
        : action === 'verify' ? { is_verified: true }
        : null

    if (!update) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    const { data, error } = await supabase.from('reviews').update(update).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ review: data })
}

export async function DELETE(req, { params }) {
    const { id } = await params
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('reviews').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
