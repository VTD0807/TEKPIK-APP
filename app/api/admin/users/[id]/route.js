import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function PATCH(req, { params }) {
    const { id } = await params
    const { role } = await req.json()
    if (!role) return NextResponse.json({ error: 'role required' }, { status: 400 })

    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('users').update({ role }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
