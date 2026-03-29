import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const redirectTo = searchParams.get('next') || searchParams.get('redirect') || '/'
    const errorParam = searchParams.get('error')

    if (errorParam) {
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorParam)}`)
    }

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=missing_code`)
    }

    const supabase = await createSupabaseServerClient()

    // Exchange code for session — Supabase sets the cookie automatically
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
        console.error('[oauth/callback]', error.message)
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    // Upsert user into public.users
    if (data?.user) {
        const u = data.user
        await supabase.from('users').upsert({
            id: u.id,
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || '',
            email: u.email || '',
            image: u.user_metadata?.avatar_url || '',
        }, { onConflict: 'id', ignoreDuplicates: false })
    }

    return NextResponse.redirect(`${origin}${redirectTo}`)
}
