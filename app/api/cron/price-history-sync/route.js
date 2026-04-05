import { NextResponse } from 'next/server'
import { syncDailyPriceHistory } from '@/lib/price-history-tracker'

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
        const result = await syncDailyPriceHistory({ force: false })
        return NextResponse.json(result)
    } catch (error) {
        console.error('[cron:price-history-sync]', error)
        return NextResponse.json({ error: error.message || 'Price history sync failed' }, { status: 500 })
    }
}
