import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
    const { provider } = await params
    const { searchParams, origin } = new URL(request.url)
    const redirectAfter = searchParams.get('redirect') || '/'

    if (provider !== 'google') {
        return NextResponse.json({ error: 'Only google supported' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Use Supabase OAuth but redirect back to OUR callback, not supabase.co
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${origin}/oauth/callback?next=${encodeURIComponent(redirectAfter)}`,
            skipBrowserRedirect: true,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    })

    if (error || !data?.url) {
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error?.message || 'OAuth failed')}`)
    }

    return NextResponse.redirect(data.url)
}
