/**
 * lib/mailer.js
 * Core email sender — uses Resend in production, logs in dev.
 */

import { dbWorkspace } from '@/lib/firebase-admin'

const APP_NAME = 'TEKPIK'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tekpik.in'
const ENV_RESEND_API_KEY = process.env.RESEND_API_KEY
const ENV_RESEND_SECONDARY_API_KEY = process.env.RESEND_SECONDARY_API_KEY
const ENV_RESEND_SECONDARY_DOMAIN = process.env.RESEND_SECONDARY_DOMAIN || 'truvgo.me'
const ENV_FROM_ADDRESS = process.env.MAIL_FROM || `${APP_NAME} <hello@tekpik.in>`

let cachedConfig = null
let cacheTime = 0

async function getMailConfig() {
    if (cachedConfig && (Date.now() - cacheTime < 60000)) return cachedConfig
    if (!dbWorkspace) return null
    try {
        const snap = await dbWorkspace.collection('settings').doc('mail_settings').get()
        if (snap.exists) {
            cachedConfig = snap.data()
            cacheTime = Date.now()
            return cachedConfig
        }
    } catch(e) {}
    return null
}

/**
 * Send a single email.
 * @param {{ to: string|string[], subject: string, html: string, text?: string, replyTo?: string }} opts
 */
export async function sendMail({ to, subject, html, text, replyTo }) {
    const recipients = Array.isArray(to) ? to : [to]
    if (!recipients.length) throw new Error('No recipients provided')

    const config = await getMailConfig() || {}
    const useCustom = Boolean(config.useCustomServer)

    const API_KEY = useCustom && config.primaryApiKey ? config.primaryApiKey : ENV_RESEND_API_KEY
    const SECONDARY_API_KEY = useCustom && config.secondaryApiKey ? config.secondaryApiKey : ENV_RESEND_SECONDARY_API_KEY
    const SECONDARY_DOMAIN = useCustom && config.secondaryDomain ? config.secondaryDomain : ENV_RESEND_SECONDARY_DOMAIN
    const FROM = useCustom && config.senderEmail ? `${config.fromName || APP_NAME} <${config.senderEmail}>` : ENV_FROM_ADDRESS

    if (!API_KEY) {
        // Dev fallback — log to console
        console.log('\n📧 [mailer] DEV — email not sent (set RESEND_API_KEY or configure custom server)')
        console.log(`   To:      ${recipients.join(', ')}`)
        console.log(`   Subject: ${subject}`)
        console.log(`   Preview: ${text?.slice(0, 120) || '(html only)'}`)
        return { success: true, dev: true }
    }

    let res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: FROM,
            to: recipients,
            subject,
            html,
            text: text || '',
            ...(replyTo ? { reply_to: replyTo } : {}),
        }),
    })

    // Automatic Failover to Secondary Mail Server
    if (!res.ok && SECONDARY_API_KEY) {
        console.warn(`[mailer] Primary mail server failed (${res.status}). Failing over to Secondary Server...`)
        res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${SECONDARY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: `${config.fromName || APP_NAME} <hello@${SECONDARY_DOMAIN}>`,
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
