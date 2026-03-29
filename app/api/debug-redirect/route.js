import { NextResponse } from 'next/server'

export async function GET(request) {
    const { origin } = new URL(request.url)
    return NextResponse.json({
        callbackUrl: `${origin}/oauth/callback`,
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.slice(-20),
    })
}
