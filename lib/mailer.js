/**
 * lib/mailer.js
 * Core email sender — uses Resend in production, logs in dev.
 */

const APP_NAME = 'TEKPIK'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tekpik.in'
const FROM_ADDRESS = process.env.MAIL_FROM || `${APP_NAME} <hello@tekpik.in>`
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_SECONDARY_API_KEY = process.env.RESEND_SECONDARY_API_KEY
const RESEND_SECONDARY_DOMAIN = process.env.RESEND_SECONDARY_DOMAIN || 'truvgo.me'

/**
 * Send a single email.
 * @param {{ to: string|string[], subject: string, html: string, text?: string, replyTo?: string }} opts
 */
export async function sendMail({ to, subject, html, text, replyTo }) {
    const recipients = Array.isArray(to) ? to : [to]
    if (!recipients.length) throw new Error('No recipients provided')

    if (!RESEND_API_KEY) {
        // Dev fallback — log to console
        console.log('\n📧 [mailer] DEV — email not sent (set RESEND_API_KEY)')
        console.log(`   To:      ${recipients.join(', ')}`)
        console.log(`   Subject: ${subject}`)
        console.log(`   Preview: ${text?.slice(0, 120) || '(html only)'}`)
        return { success: true, dev: true }
    }

    let res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: FROM_ADDRESS,
            to: recipients,
            subject,
            html,
            text: text || '',
            ...(replyTo ? { reply_to: replyTo } : {}),
        }),
    })

    // Automatic Failover to Secondary Mail Server
    if (!res.ok && RESEND_SECONDARY_API_KEY) {
        console.warn(`[mailer] Primary mail server failed (${res.status}). Failing over to Secondary Server...`)
        res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_SECONDARY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: `${APP_NAME} <hello@${RESEND_SECONDARY_DOMAIN}>`,
                to: recipients,
                subject,
                html,
                text: text || '',
                ...(replyTo ? { reply_to: replyTo } : {}),
            }),
        })
    }

    if (!res.ok) {
        const err = await res.text().catch(() => res.statusText)
        throw new Error(`Resend error ${res.status}: ${err}`)
    }

    return { success: true, data: await res.json().catch(() => null) }
}

/**
 * Send to many recipients in batches (Resend allows max 50/call).
 */
export async function sendMailBatch(recipients, { subject, html, text }) {
    const BATCH = 50
    const results = []
    for (let i = 0; i < recipients.length; i += BATCH) {
        const chunk = recipients.slice(i, i + BATCH)
        try {
            const r = await sendMail({ to: chunk, subject, html, text })
            results.push({ ok: true, count: chunk.length, ...r })
        } catch (err) {
            results.push({ ok: false, count: chunk.length, error: err.message })
        }
    }
    return results
}

export { APP_URL, APP_NAME, FROM_ADDRESS }
