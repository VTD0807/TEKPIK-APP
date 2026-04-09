import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''

/**
 * GET: View bot stats and recent imports
 */
export async function GET(req) {
    if (!dbAdmin) {
        return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const limit = Number(searchParams.get('limit')) || 20
        const action = searchParams.get('action')

        // Get recent imports
        const importsSnap = await dbAdmin
            .collection('telegram_imports')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get()

        const imports = []
        importsSnap.forEach(doc => {
            imports.push({
                id: doc.id,
                ...doc.data(),
                createdAt: timestampToJSON(doc.data().createdAt),
            })
        })

        // Get stats
        const statsSnap = await dbAdmin.collection('telegram_imports').get()
        const stats = {
            totalImports: statsSnap.size,
            successCount: statsSnap.docs.filter(d => d.data().status === 'success').length,
            failedCount: statsSnap.docs.filter(d => d.data().status === 'failed').length,
            errorCount: statsSnap.docs.filter(d => d.data().status === 'error').length,
        }
        stats.successRate = stats.totalImports > 0
            ? Math.round((stats.successCount / stats.totalImports) * 100)
            : 0

        // Bot info
        let botInfo = null
        if (action === 'bot-info' && TELEGRAM_BOT_TOKEN) {
            try {
                const infoRes = await fetch(
                    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`
                )
                botInfo = await infoRes.json()
            } catch (err) {
                botInfo = { error: err.message }
            }
        }

        return NextResponse.json({
            stats,
            recentImports: imports,
            botToken: TELEGRAM_BOT_TOKEN ? 'configured' : 'not_configured',
            botInfo,
        })
    } catch (error) {
        console.error('[telegram-import-stats]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * POST: Clear import logs or perform maintenance
 */
export async function POST(req) {
    if (!dbAdmin) {
        return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const action = body.action

        if (action === 'clear-logs') {
            const snap = await dbAdmin.collection('telegram_imports').get()
            let deleted = 0

            for (const doc of snap.docs) {
                await doc.ref.delete()
                deleted++
            }

            return NextResponse.json({
                message: `Cleared ${deleted} import logs`,
                deleted,
            })
        }

        if (action === 'test-webhook') {
            const webhookUrl = body.webhookUrl
            if (!webhookUrl || !TELEGRAM_BOT_TOKEN) {
                return NextResponse.json({
                    error: 'Missing webhookUrl or TELEGRAM_BOT_TOKEN',
                }, { status: 400 })
            }

            try {
                const setWebhookRes = await fetch(
                    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            url: webhookUrl,
                            allowed_updates: ['message', 'channel_post'],
                        }),
                    }
                )

                const result = await setWebhookRes.json()
                return NextResponse.json({
                    success: result.ok,
                    message: result.description,
                    details: result,
                })
            } catch (error) {
                return NextResponse.json({
                    error: error.message,
                    success: false,
                }, { status: 500 })
            }
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    } catch (error) {
        console.error('[telegram-import-admin]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
