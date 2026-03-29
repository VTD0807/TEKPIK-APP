'use client'
import posthog from 'posthog-js'

let initialized = false

export function initPostHog() {
    if (initialized || typeof window === 'undefined') return
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        capture_pageview: true,
        persistence: 'localStorage',
    })
    initialized = true
}

export { posthog }
