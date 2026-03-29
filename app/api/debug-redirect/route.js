import { NextResponse } from 'next/server'

export async function GET(request) {
    const { origin } = new URL(request.url)
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'NOT SET'
    
    // Build the exact URL that would be sent to Google
    const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleUrl.searchParams.set('client_id', clientId)
    googleUrl.searchParams.set('redirect_uri', `${origin}/oauth/callback`)
    googleUrl.searchParams.set('response_type', 'code')
    googleUrl.searchParams.set('scope', 'openid email profile')

    return NextResponse.json({
        clientId_full: clientId,
        clientId_length: clientId.length,
        callbackUrl: `${origin}/oauth/callback`,
        googleUrl: googleUrl.toString(),
    })
}
