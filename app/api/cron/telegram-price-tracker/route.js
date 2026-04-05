import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'
import { normalizeTelegramManagerConfig, readTelegramManagerConfig, runTelegramPriceTracker } from '@/lib/telegram-manager'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const isCronRequest = (req) => {
    const userAgent = req.headers.get('user-agent') || ''
    const vercelCron = req.headers.get('x-vercel-cron')
    return Boolean(vercelCron) || /vercel-cron/i.test(userAgent)
}

export async function GET(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    if (!isCronRequest(req)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const current = normalizeTelegramManagerConfig(await readTelegramManagerConfig(dbAdmin))
        if (!current.enabled || !current.priceTrackerEnabled) {
            return NextResponse.json({ skipped: true, reason: 'Telegram price tracker is disabled.' })
        }

        const result = await runTelegramPriceTracker(dbAdmin, current, {
            limit: current.maxPerRun,
            delayMs: current.delayMs,
        })

        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        console.error('[cron:telegram-price-tracker]', error)
        return NextResponse.json({ error: error.message || 'Price tracker failed' }, { status: 500 })
    }
}
