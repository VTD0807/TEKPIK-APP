import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
        .from('users')
        .select('id, name, email, image, role, created_at')
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ users: data || [] })
}

export async function PATCH(req) {
    const { userId, role } = await req.json()
    if (!userId || !role) return NextResponse.json({ error: 'userId and role required' }, { status: 400 })

    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('users').update({ role }).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
