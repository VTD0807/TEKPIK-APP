'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''
const ONESIGNAL_SDK_SRC = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
const PROMPT_SESSION_KEY = 'tekpik_onesignal_prompt_shown'

let initPromise = null

const loadScript = () => {
    if (typeof window === 'undefined') return Promise.resolve()
    if (window.OneSignal || document.querySelector(`script[src="${ONESIGNAL_SDK_SRC}"]`)) {
        return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = ONESIGNAL_SDK_SRC
        script.defer = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load OneSignal SDK'))
        document.head.appendChild(script)
    })
}

const initOneSignal = async () => {
    if (!ONESIGNAL_APP_ID || typeof window === 'undefined') return null
    if (initPromise) return initPromise

    initPromise = (async () => {
        await loadScript()
        window.OneSignalDeferred = window.OneSignalDeferred || []

        return new Promise((resolve) => {
            window.OneSignalDeferred.push(async (OneSignal) => {
                try {
                    await OneSignal.init({
                        appId: ONESIGNAL_APP_ID,
                        serviceWorkerPath: '/OneSignalSDKWorker.js',
                        serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
                        allowLocalhostAsSecureOrigin: true,
                        notifyButton: { enable: false },
                        promptOptions: {
                            slidedown: {
                                enabled: true,
                                autoPrompt: false,
                                timeDelay: 5,
                                pageViews: 1,
                            },
                        },
                    })
                    resolve(OneSignal)
                } catch {
                    resolve(null)
                }
            })
        })
    })()

    return initPromise
}

export default function OneSignalPushManager() {
    const { user } = useAuth()
    const promptedRef = useRef(false)

    useEffect(() => {
        if (!ONESIGNAL_APP_ID) return

        let disposed = false

        const sync = async () => {
            const OneSignal = await initOneSignal()
            if (!OneSignal || disposed) return

            try {
                if (user?.uid) {
                    await OneSignal.login(user.uid)
                } else {
                    await OneSignal.logout()
                }
            } catch {
                // Keep app flow resilient when OneSignal login/logout fails.
            }

            if (promptedRef.current) return
            if (typeof window === 'undefined') return
            if (window.sessionStorage.getItem(PROMPT_SESSION_KEY) === '1') return

            try {
                const canPrompt = Notification.permission === 'default'
                if (canPrompt) {
                    await OneSignal.Slidedown.promptPush()
                    window.sessionStorage.setItem(PROMPT_SESSION_KEY, '1')
                    promptedRef.current = true
                }
            } catch {
                // Ignore prompt errors to avoid impacting UX.
            }
        }

        sync()

        return () => {
            disposed = true
        }
    }, [user?.uid])

    return null
}
