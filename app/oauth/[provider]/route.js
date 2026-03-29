import { NextResponse } from 'next/server'

const GOOGLE_CLIENT_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim()

/**
 * GET /oauth/google?redirect=/
 * Redirects directly to Google — no Supabase in the URL.
 * Google will show "localhost:3000" not "supabase.co"
 */
export async function GET(request, { params }) {
    const { provider } = await params
    const { searchParams, origin } = new URL(request.url)
    const redirectAfter = searchParams.get('redirect') || '/'

    if (provider !== 'google') {
        return NextResponse.json({ error: 'Only google supported' }, { status: 400 })
    }

    const callbackUrl = `${origin}/oauth/callback`

    // Build Google OAuth URL directly — bypasses Supabase entirely
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
    googleAuthUrl.searchParams.set('redirect_uri', callbackUrl)
    googleAuthUrl.searchParams.set('response_type', 'code')
    googleAuthUrl.searchParams.set('scope', 'openid email profile')
    googleAuthUrl.searchParams.set('access_type', 'offline')
    googleAuthUrl.searchParams.set('prompt', 'consent')
    googleAuthUrl.searchParams.set('state', encodeURIComponent(redirectAfter))

    return NextResponse.redirect(googleAuthUrl.toString())
}
