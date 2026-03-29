import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const GOOGLE_CLIENT_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim()
const GOOGLE_CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || '').trim()

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

    // 3. Try signInWithIdToken first (works if Google provider enabled in Supabase)
    const supabase = await createSupabaseServerClient()
    let userId = null

    const { data: idTokenData, error: idTokenError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: tokens.id_token,
    })

    if (!idTokenError && idTokenData?.user) {
        userId = idTokenData.user.id
    } else {
        // 4. Fallback: use admin to create/get user by email
        console.log('[oauth/callback] signInWithIdToken failed, trying admin upsert:', idTokenError?.message)

        // Use service role to create user if not exists
        const { createClient } = await import('@supabase/supabase-js')
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Check if user exists
        const { data: existingUsers } = await adminClient.auth.admin.listUsers()
        const existing = existingUsers?.users?.find(u => u.email === googleUser.email)

        if (existing) {
            userId = existing.id
            // Generate a magic link to create a session
            const { data: linkData } = await adminClient.auth.admin.generateLink({
                type: 'magiclink',
                email: googleUser.email,
            })
            if (linkData?.properties?.hashed_token) {
                // Exchange the token for a session
                const { data: sessionData } = await supabase.auth.verifyOtp({
                    token_hash: linkData.properties.hashed_token,
                    type: 'magiclink',
                })
                if (sessionData?.user) userId = sessionData.user.id
            }
        } else {
            // Create new user
            const { data: newUser } = await adminClient.auth.admin.createUser({
                email: googleUser.email,
                email_confirm: true,
                user_metadata: {
                    full_name: googleUser.name,
                    avatar_url: googleUser.picture,
                    provider: 'google',
                },
            })
            if (newUser?.user) {
                userId = newUser.user.id
                const { data: linkData } = await adminClient.auth.admin.generateLink({
                    type: 'magiclink',
                    email: googleUser.email,
                })
                if (linkData?.properties?.hashed_token) {
                    await supabase.auth.verifyOtp({
                        token_hash: linkData.properties.hashed_token,
                        type: 'magiclink',
                    })
                }
            }
        }
    }

    // 5. Upsert into public.users
    if (userId) {
        await supabase.from('users').upsert({
            id: userId,
            name: googleUser.name || googleUser.email.split('@')[0],
            email: googleUser.email,
            image: googleUser.picture || '',
        }, { onConflict: 'id' })
    }

    return NextResponse.redirect(`${origin}${redirectAfter}`)
}
