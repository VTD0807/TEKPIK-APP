import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { sendMail } from '@/lib/mailer'
import { staleProductsEmailHtml } from '@/lib/mail-templates'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const STALE_HOURS = 5

const isCronRequest = (req) => {
    const vercelCron = req.headers.get('x-vercel-cron')
    const userAgent = req.headers.get('user-agent') || ''
    return Boolean(vercelCron) || /vercel-cron/i.test(userAgent)
}

export async function GET(req) {
    if (!isCronRequest(req)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const db = await getAdminDb()
        if (!db) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

        // Fetch all products (only fields needed for staleness check)
        const snap = await db.collection('products').select(
            'title', 'brand', 'amazonSyncedAt', 'lastUpdated', 'updatedAt'
        ).get()

        const staleProducts = []
        const threshold = STALE_HOURS * 60 * 60 * 1000

        snap.forEach(doc => {
            const p = doc.data()
            const raw = p.amazonSyncedAt || p.lastUpdated || p.updatedAt
            const ts = raw
                ? (typeof raw?.toDate === 'function' ? raw.toDate().getTime() : new Date(raw).getTime())
                : 0
            if (!ts || (Date.now() - ts) > threshold) {
                staleProducts.push({
                    title: p.title || 'Unknown Product',
                    brand: p.brand || '',
                    hoursAgo: ts ? Math.floor((Date.now() - ts) / 3_600_000) : '?',
                })
            }
        })

        if (staleProducts.length === 0) {
            return NextResponse.json({ success: true, stale: 0, message: 'All products are up-to-date.' })
        }

        // Get admin emails
        const adminSnap = await db.collection('users').where('role', '==', 'ADMIN').limit(10).get()
        const adminEmails = []
        adminSnap.forEach(doc => { const e = doc.data()?.email; if (e) adminEmails.push(e) })

        if (adminEmails.length === 0) {
            return NextResponse.json({ success: false, message: 'No admin emails found.', stale: staleProducts.length })
        }

        await sendMail({
            to: adminEmails,
            subject: `⚠️ ${staleProducts.length} stale product${staleProducts.length !== 1 ? 's' : ''} need updating — TEKPIK`,
            html: staleProductsEmailHtml({ products: staleProducts, hoursThreshold: STALE_HOURS }),
        })

        console.log(`[cron:stale-product-alert] Sent stale alert for ${staleProducts.length} products to ${adminEmails.length} admin(s).`)

        return NextResponse.json({
            success: true,
            stale: staleProducts.length,
            adminEmails,
        })
    } catch (error) {
        console.error('[cron:stale-product-alert]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
