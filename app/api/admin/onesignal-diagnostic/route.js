import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * OneSignal diagnostic endpoint
 * Shows status of OneSignal SDK, permission, subscription, etc.
 */
export async function GET(req) {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY

    const config = {
        appIdConfigured: Boolean(appId),
        restApiKeyConfigured: Boolean(restApiKey),
        appId: appId ? `${appId.substring(0, 20)}...` : 'NOT SET',
        restApiKey: restApiKey ? `${restApiKey.substring(0, 10)}...` : 'NOT SET',
    }

    const instructions = {
        step1: {
            title: 'Check OneSignal Configuration',
            status: config.appIdConfigured ? '✅ App ID is set' : '❌ App ID is missing',
            action: config.appIdConfigured ? 'OK' : 'Add NEXT_PUBLIC_ONESIGNAL_APP_ID to .env.local',
        },
        step2: {
            title: 'Check OneSignalPushManager Component',
            status: 'Visit any page on your site',
            action: 'Open browser console (F12) and check for OneSignal logs',
            lookFor: [
                'OneSignal user logged in: ...',
                'OneSignal prompt shown',
                'Permission already granted',
                'Any error messages',
            ],
        },
        step3: {
            title: 'Check Permission Prompt',
            status: 'Should appear within 2 seconds of page load',
            action: 'If not showing, check:',
            checks: [
                '1. Hard refresh page (Ctrl+F5)',
                '2. Check browser console for errors',
                '3. Check OneSignal SDK loaded: window.OneSignal in console',
                '4. Verify site is HTTPS',
                '5. Verify service workers accessible: /OneSignalSDKWorker.js',
            ],
        },
        step4: {
            title: 'Verify Android/iOS Service Workers',
            status: 'File should exist at project root',
            files: [
                'public/OneSignalSDKWorker.js',
                'public/OneSignalSDKUpdaterWorker.js',
            ],
        },
        step5: {
            title: 'Test Sending Notification',
            status: 'Once user grants permission',
            action: 'POST /api/admin/notifications with test notification',
            example: {
                title: 'Test Notification',
                message: 'This is a test from TEKPIK',
                targetType: 'all',
            },
        },
    }

    return NextResponse.json({
        status: 'OneSignal Diagnostic',
        timestamp: new Date().toISOString(),
        config,
        checklist: instructions,
        tips: {
            browserConsole: 'Open DevTools (F12) and check Console tab for OneSignal logs',
            hardRefresh: 'Use Ctrl+F5 (or Cmd+Shift+R on Mac) to hard refresh and clear cache',
            permissions: 'Notification.permission can be: "default", "granted", or "denied"',
            localStorage: 'OneSignal stores subscription in localStorage - check there if stuck',
            serviceWorker: 'Service worker must be accessible at exact path: /OneSignalSDKWorker.js',
            https: 'Must use HTTPS on tekpik.in',
        },
        debugCommands: {
            checkSDK: 'Run in browser console: window.OneSignal ? "loaded" : "not loaded"',
            checkSubscription: 'Run in browser console: await OneSignal.User.pushSubscription.optIn()',
            checkPermission: 'Run in browser console: Notification.permission',
            getExternalId: 'Run in browser console: (await OneSignal.User.getOnesignalId())',
        },
    })
}
