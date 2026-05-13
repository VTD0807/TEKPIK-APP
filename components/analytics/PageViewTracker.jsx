'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { getDeviceId, getDeviceIdAsync, getDeviceFingerprint } from '@/lib/device'

export default function PageViewTracker() {
    const pathname = usePathname()
    const { user, loading } = useAuth()
    const sentKeysRef = useRef(new Set())
    const resolvedIdRef = useRef('')

    // Resolve persistent device ID once (async — includes IDB + server recovery)
    useEffect(() => {
        getDeviceIdAsync().then(id => { resolvedIdRef.current = id })
    }, [])

    useEffect(() => {
        if (loading || !pathname) return

        const accountId = user?.uid || ''
        const cacheKey = `${pathname}::${accountId || 'anon'}`
        if (sentKeysRef.current.has(cacheKey)) return

        // Use sync fast-path first, fallback to resolved async ID
        const deviceId = getDeviceId() || resolvedIdRef.current
        if (!deviceId) return

        const fingerprint = getDeviceFingerprint()

        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
        const platform = typeof navigator !== 'undefined' ? (navigator.platform || '') : ''
        const language = typeof navigator !== 'undefined' ? (navigator.language || '') : ''
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
        const screenData = typeof window !== 'undefined'
            ? {
                width: window.screen?.width || null,
                height: window.screen?.height || null,
                devicePixelRatio: window.devicePixelRatio || null,
            }
            : {}

        sentKeysRef.current.add(cacheKey)

        fetch('/api/analytics/page-view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pagePath: pathname,
                deviceId,
                accountId: accountId || null,
                fingerprint,
                userAgent: ua,
                platform,
                language,
                timezone,
                screen: screenData,
            }),
            keepalive: true,
        }).catch(() => {})
    }, [pathname, user?.uid, loading])

    return null
}
