import { NextResponse } from 'next/server'
import { sendOneSignalPush, broadcastNotification, isOneSignalConfigured } from '@/lib/onesignal-utils'
import { dbAdmin } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

/**
 * Test endpoint to verify OneSignal and notification systems are working
 * POST with { userId: "firebase-uid" } to send a test notification
 */
export async function POST(req) {
    try {
        const body = await req.json().catch(() => ({}))
        const { userId, testType = 'all' } = body

        const results = {
            timestamp: new Date().toISOString(),
            tests: {},
        }

        // Test 1: Check OneSignal configuration
        results.tests.onesignalConfig = isOneSignalConfigured()
        if (!results.tests.onesignalConfig) {
            return NextResponse.json({
                ...results,
                error: 'OneSignal is not configured (missing ONESIGNAL_REST_API_KEY or NEXT_PUBLIC_ONESIGNAL_APP_ID)',
            }, { status: 400 })
        }

        // Test 2: Send test notification
        if (testType === 'all' || testType === 'push') {
            const target = userId ? [userId] : ['All']
            const pushResult = await sendOneSignalPush({
                heading: '🧪 TEKPIK Test Notification',
                content: 'If you see this, OneSignal web push is working! 🎉',
                bigImage: 'https://tekpik.in/logo-tekpik.png',
                data: { type: 'test', timestamp: Date.now() },
                ...(userId ? { externalUserIds: [userId] } : { includedSegments: ['All'] }),
            })
            results.tests.pushNotification = pushResult
        }

        // Test 3: Check Firestore connection
        if (testType === 'all' || testType === 'firestore') {
            try {
                const userDoc = userId ? 
                    await dbAdmin.collection('users').doc(userId).get() :
                    await dbAdmin.collection('users').limit(1).get()
                results.tests.firestore = {
                    connected: true,
                    docCount: userId ? (userDoc.exists ? 1 : 0) : userDoc.size,
                }
            } catch (err) {
                results.tests.firestore = { connected: false, error: err.message }
            }
        }

        // Test 4: Check sample products
        if (testType === 'all' || testType === 'products') {
            try {
                const productsSnap = await dbAdmin.collection('products').limit(1).get()
                results.tests.products = {
                    available: productsSnap.size > 0,
                    sampleCount: productsSnap.size,
                }
            } catch (err) {
                results.tests.products = { available: false, error: err.message }
            }
        }

        // Test 5: Check wishlists
        if (testType === 'all' || testType === 'wishlists') {
            try {
                const wishlistSnap = await dbAdmin.collection('wishlists').limit(10).get()
                results.tests.wishlists = {
                    available: wishlistSnap.size > 0,
                    sampleCount: wishlistSnap.size,
                }
            } catch (err) {
                results.tests.wishlists = { available: false, error: err.message }
            }
        }

        return NextResponse.json(results)
    } catch (error) {
        return NextResponse.json({ 
            error: error.message,
            timestamp: new Date().toISOString(),
        }, { status: 500 })
    }
}

/**
 * GET returns status of all notification systems
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        const testType = searchParams.get('type') || 'config'

        const status = {
            timestamp: new Date().toISOString(),
            onesignal: isOneSignalConfigured(),
        }

        // Check Firebase
        if (testType === 'all' || testType === 'firebase') {
            try {
                const snap = await dbAdmin.collection('settings').doc('general').get()
                status.firebase = { connected: true, hasSettings: snap.exists }
            } catch (err) {
                status.firebase = { connected: false, error: err.message }
            }
        }

        // Check sample user
        if (userId) {
            try {
                const userDoc = await dbAdmin.collection('users').doc(userId).get()
                status.user = { 
                    exists: userDoc.exists,
                    email: userDoc.data()?.email,
                    role: userDoc.data()?.role,
                }
            } catch (err) {
                status.user = { exists: false, error: err.message }
            }
        }

        return NextResponse.json(status)
    } catch (error) {
        return NextResponse.json({
            error: error.message,
            timestamp: new Date().toISOString(),
        }, { status: 500 })
    }
}
