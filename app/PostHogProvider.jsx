'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }) {
    useEffect(() => {
        const token = process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
        if (!token) return

        posthog.init(token, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
            capture_pageview: true, // Auto capture pageviews
            persistence: 'localStorage',
        })
    }, [])

    return <PHProvider client={posthog}>{children}</PHProvider>
}
