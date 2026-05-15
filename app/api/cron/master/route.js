import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

const isCronRequest = (req) => {
    const vercelCron = req.headers.get('x-vercel-cron')
    const userAgent = req.headers.get('user-agent') || ''
    return Boolean(vercelCron) || /vercel-cron/i.test(userAgent)
}

export async function GET(req) {
    if (!isCronRequest(req)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const origin = new URL(req.url).origin
    const results = {}

    const tasks = [
        { name: 'product-updater', path: '/api/cron/product-updater' },
        { name: 'telegram-price-tracker', path: '/api/cron/telegram-price-tracker' },
        { name: 'price-history-sync', path: '/api/cron/price-history-sync' },
        { name: 'stale-product-alert', path: '/api/cron/stale-product-alert' }
    ]

    for (const task of tasks) {
        try {
            console.log(`[Master Cron] Starting ${task.name}...`)
            const res = await fetch(`${origin}${task.path}`, {
                headers: { 'x-vercel-cron': '1' },
                cache: 'no-store'
            })
            results[task.name] = {
                ok: res.ok,
                status: res.status,
                data: await res.json().catch(() => ({}) )
            }
        } catch (e) {
            results[task.name] = { ok: false, error: e.message }
        }
    }

    return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        results
    })
}
