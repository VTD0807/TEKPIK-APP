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
                                autoPrompt: true,  // Auto-show permission prompt
                                timeDelay: 2,      // Wait 2 seconds before showing
                                pageViews: 1,      // Show on first page view
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
        if (!ONESIGNAL_APP_ID) {
            console.warn('OneSignal App ID not configured')
            return
        }

        let disposed = false

        const sync = async () => {
            try {
                const OneSignal = await initOneSignal()
                if (!OneSignal || disposed) return

                // Login/logout user
                try {
                    if (user?.uid) {
                        await OneSignal.login(user.uid)
                        console.log('OneSignal user logged in:', user.uid)
                    } else {
                        await OneSignal.logout()
                    }
                } catch (err) {
                    console.debug('OneSignal login/logout:', err.message)
                }

                // Show prompt if needed (fallback for manual prompt)
                if (!promptedRef.current && typeof window !== 'undefined' && !window.sessionStorage.getItem(PROMPT_SESSION_KEY)) {
                    try {
                        const permission = Notification.permission
                        if (permission === 'default') {
                            // Permission hasn't been asked yet, try manual prompt
                            await OneSignal.Slidedown.promptPush()
                            console.log('OneSignal prompt shown')
                            window.sessionStorage.setItem(PROMPT_SESSION_KEY, '1')
                            promptedRef.current = true
                        } else if (permission === 'granted') {
                            console.log('Notification permission already granted')
                            promptedRef.current = true
                        }
                    } catch (promptErr) {
                        console.debug('OneSignal prompt error:', promptErr.message)
                    }
                }
            } catch (err) {
                console.error('OneSignal initialization error:', err)
            }
        }

        sync()

        return () => {
            disposed = true
        }
    }, [user?.uid])

    return null
}
