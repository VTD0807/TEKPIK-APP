import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const GOOGLE_CLIENT_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim()
const GOOGLE_CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || '').trim()

/**
 * GET /oauth/callback?code=xxx&state=/
 * Exchanges Google code for tokens, upserts user in Supabase DB,
 * creates a Supabase session manually.
 */
export async function GET(request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const errorParam = searchParams.get('error')
    const redirectAfter = state ? decodeURIComponent(state) : '/'

    if (errorParam) {
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorParam)}`)
    }
    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=missing_code`)
    }

    // 1. Exchange code for Google tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: `${origin}/oauth/callback`,
            grant_type: 'authorization_code',
        }),
    })

    if (!tokenRes.ok) {
        const err = await tokenRes.text()
        console.error('[oauth/callback] token exchange failed:', err)
        return NextResponse.redirect(`${origin}/login?error=token_exchange_failed`)
    }

    const tokens = await tokenRes.json()

    // 2. Get user info from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const googleUser = await userRes.json()

    if (!googleUser.email) {
        return NextResponse.redirect(`${origin}/login?error=no_email_from_google`)
    }

    // 3. Sign in or create user via Supabase Admin (uses service role)
    //    We use signInWithIdToken so Supabase creates the session cookie
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: tokens.id_token,
    })

    if (error) {
        console.error('[oauth/callback] signInWithIdToken error:', error.message)
        // Fallback: upsert user directly and create magic link session
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    // 4. Upsert into public.users
    if (data.user) {
        await supabase.from('users').upsert({
            id: data.user.id,
            name: googleUser.name || googleUser.email.split('@')[0],
            email: googleUser.email,
            image: googleUser.picture || '',
        }, { onConflict: 'id' })
    }

    return NextResponse.redirect(`${origin}${redirectAfter}`)
}
