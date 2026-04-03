'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const DEVICE_KEY = 'tekpik_device_id'

const getDeviceId = () => {
    if (typeof window === 'undefined') return ''

    let id = localStorage.getItem(DEVICE_KEY)
    if (id) return id

    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        id = crypto.randomUUID()
    } else {
        id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    }

    localStorage.setItem(DEVICE_KEY, id)
    return id
}

export default function PageViewTracker() {
    const pathname = usePathname()
    const { user, loading } = useAuth()
    const sentKeysRef = useRef(new Set())

    useEffect(() => {
        if (loading || !pathname) return

        const accountId = user?.uid || ''
        const cacheKey = `${pathname}::${accountId || 'anon'}`
        if (sentKeysRef.current.has(cacheKey)) return

        const deviceId = getDeviceId()
        if (!deviceId) return

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
