import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const isCronRequest = (req) => {
    const userAgent = req.headers.get('user-agent') || ''
    const vercelCron = req.headers.get('x-vercel-cron')
    return Boolean(vercelCron) || /vercel-cron/i.test(userAgent)
}

export async function GET(req) {
    if (!isCronRequest(req)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const origin = new URL(req.url).origin
        const targetUrl = `${origin}/api/admin/product-updater`

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ force: false }),
            cache: 'no-store',
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
            return NextResponse.json({
                error: payload?.error || 'Product updater cron failed.',
                upstreamStatus: response.status,
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            source: 'cron:product-updater',
            ...payload,
        })
    } catch (error) {
        console.error('[cron:product-updater]', error)
        return NextResponse.json({ error: error.message || 'Product updater cron failed' }, { status: 500 })
    }
}