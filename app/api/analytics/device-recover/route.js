/**
 * POST /api/analytics/device-recover
 * Given a canvas/WebGL fingerprint, look up if we've seen this device before
 * and return its original UUID. This allows re-association after full cache wipe.
 */
import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ deviceId: null })

    try {
        const body = await req.json().catch(() => ({}))
        const fingerprint = String(body.fingerprint || '').trim()
        if (!fingerprint) return NextResponse.json({ deviceId: null })

        // Look up by fingerprint in the device registry
        const snap = await dbAdmin.collection('analytics_devices')
            .where('fingerprints', 'array-contains', fingerprint)
            .orderBy('firstSeenAt', 'asc')
            .limit(1)
            .get()

        if (snap.empty) return NextResponse.json({ deviceId: null })

        const doc = snap.docs[0]
        const data = doc.data() || {}
        return NextResponse.json({ deviceId: data.deviceId || doc.id })
    } catch (err) {
        console.error('[device-recover]', err)
        return NextResponse.json({ deviceId: null })
    }
}
