'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }) {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') return

        const token = process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
        if (!token) return

        const init = () => {
            if (posthog.__loaded) return
            posthog.init(token, {
                api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
                capture_pageview: true,
                capture_pageleave: false,
                disable_session_recording: true,
                persistence: 'localStorage',
            })
        }

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            const idleHandle = window.requestIdleCallback(init, { timeout: 2000 })
            return () => {
                if (typeof window.cancelIdleCallback === 'function') {
                    window.cancelIdleCallback(idleHandle)
                }
            }
        }

        const timer = window.setTimeout(init, 250)
        return () => window.clearTimeout(timer)
    }, [])

    return <PHProvider client={posthog}>{children}</PHProvider>
}
