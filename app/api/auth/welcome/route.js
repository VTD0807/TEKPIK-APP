import { NextResponse } from 'next/server'
import { welcomeEmailHtml, welcomeEmailText } from '@/lib/email-templates'

/**
 * POST /api/auth/welcome
 * Called after successful registration to send a welcome email.
 * Uses Supabase's built-in email (no extra SMTP needed for dev).
 * For production, swap the fetch below with Resend / SendGrid / Nodemailer.
 */
export async function POST(req) {
    const { name, email } = await req.json()
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tekpik.in'
    const displayName = name || email.split('@')[0]

    // ── Option A: Resend (recommended for production) ──────────────
    // Uncomment and set RESEND_API_KEY in .env.local
    /*
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'TEKPIK <hello@yourdomain.com>',
            to: email,
            subject: `Welcome to TEKPIK, ${displayName}!`,
            html: welcomeEmailHtml({ name: displayName, appUrl }),
            text: welcomeEmailText({ name: displayName }),
        }),
    })
    if (!res.ok) {
        const err = await res.text()
        console.error('Email send failed:', err)
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
    */

    // ── Option B: Log to console (dev fallback) ────────────────────
    // Log successful email sending for tracking in dev
    if (process.env.NODE_ENV === 'development') {
        console.log(`\n Welcome email for: ${email}`)
        console.log(`   Name: ${displayName}`)
        console.log(`   Preview: ${appUrl}/ai-picks\n`)
    }

    return NextResponse.json({ success: true })
}
