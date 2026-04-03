'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { 
    onIdTokenChanged, 
    signOut as firebaseSignOut, 
    signInWithPopup, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile,
    getIdToken,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/lib/firebase'
import { isAdminEmail } from '@/lib/admin'

const AuthContext = createContext({ 
    user: null, 
    loading: true, 
    signInWithGoogle: async () => {}, 
    signInWithEmail: async () => {}, 
    signUpWithEmail: async () => {}, 
    signOut: async () => {} 
})

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30
const SESSION_MAX_AGE = 60 * 60 * 24 * 30
const AUTH_EXPIRY_KEY = 'tekpik_auth_expiry'
const DEVICE_ID_KEY = 'tekpik_device_id'
const DEVICE_COOKIE_NAME = 'tekpik_device_id'

const getSessionExpiry = () => {
    if (typeof window === 'undefined') return 0
    const value = Number(localStorage.getItem(AUTH_EXPIRY_KEY) || 0)
    return Number.isFinite(value) ? value : 0
}

const setSessionExpiry = () => {
    if (typeof window === 'undefined') return
    localStorage.setItem(AUTH_EXPIRY_KEY, String(Date.now() + SESSION_DURATION_MS))
}

const clearSessionExpiry = () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(AUTH_EXPIRY_KEY)
}

const getOrCreateDeviceId = () => {
    if (typeof window === 'undefined') return ''

    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing

    const generated = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`

    localStorage.setItem(DEVICE_ID_KEY, generated)
    return generated
}

const setDeviceCookie = (deviceId) => {
    if (typeof window === 'undefined' || !deviceId) return
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${DEVICE_COOKIE_NAME}=${deviceId}; path=/; max-age=${SESSION_MAX_AGE}; SameSite=Lax${secure}`
}

const clearDeviceCookie = () => {
    if (typeof window === 'undefined') return
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${DEVICE_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax${secure}`
}

// Sync Firebase user directly to Firestore
async function syncUserToFirestore(firebaseUser) {
    if (!firebaseUser?.uid || !firebaseUser?.email) return

    const userRef = doc(db, 'users', firebaseUser.uid)
    const existing = await getDoc(userRef).catch(() => null)
    const deviceId = getOrCreateDeviceId()

    const payload = {
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0] || 'User',
        email: firebaseUser.email,
        image: firebaseUser.photoURL || '',
        deviceId,
        deviceIds: deviceId ? [deviceId] : [],
        lastDeviceId: deviceId,
    }
    if (isAdminEmail(firebaseUser.email)) payload.role = 'ADMIN'
    if (!existing?.exists()) payload.createdAt = serverTimestamp()

    try {
        await setDoc(userRef, payload, { merge: true })
        console.log(' User synced to Firestore:', payload.email)
    } catch (err) {
        console.warn('Sync to Firestore error:', err?.message || err)
    }
}

// Set or remove session cookie for server-side auth (middleware)
async function updateSessionCookie(firebaseUser) {
    if (firebaseUser) {
        try {
            const token = await getIdToken(firebaseUser)
            const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
            document.cookie = `fb-token=${token}; path=/; max-age=${SESSION_MAX_AGE}; SameSite=Lax${secure}`
            setDeviceCookie(getOrCreateDeviceId())
        } catch (e) {
            console.warn('Failed to set session cookie:', e.message)
        }
    } else {
        const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
        document.cookie = `fb-token=; path=/; max-age=0; SameSite=Lax${secure}`
        clearDeviceCookie()
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [persistenceReady, setPersistenceReady] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            getOrCreateDeviceId()
            setDeviceCookie(getOrCreateDeviceId())
        }

        setPersistence(auth, browserLocalPersistence)
            .catch((err) => {
                console.warn('Failed to set auth persistence:', err?.message || err)
            })
            .finally(() => setPersistenceReady(true))
    }, [])

    useEffect(() => {
        if (!persistenceReady) return

        const unsub = onIdTokenChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                clearSessionExpiry()
                setUser(null)
                setLoading(false)
                updateSessionCookie(null).catch(() => {})
                return
            }

            const sessionExpiry = getSessionExpiry()
            if (!sessionExpiry) {
                setSessionExpiry()
            } else if (Date.now() > sessionExpiry) {
                await firebaseSignOut(auth).catch(() => {})
                clearSessionExpiry()
                setUser(null)
                setLoading(false)
                updateSessionCookie(null).catch(() => {})
                return
            }

            setUser(firebaseUser)
            setLoading(false)

            if (firebaseUser) {
                Promise.allSettled([
                    syncUserToFirestore(firebaseUser),
                    updateSessionCookie(firebaseUser),
                ])
            }
        })
        return unsub
    }, [persistenceReady])

    useEffect(() => {
        if (!user) return
        const interval = setInterval(() => {
            updateSessionCookie(auth.currentUser).catch(() => {})
        }, 1000 * 60 * 30)
        return () => clearInterval(interval)
    }, [user])

    const signInWithGoogle = async () => {
        await setPersistence(auth, browserLocalPersistence)
        const result = await signInWithPopup(auth, googleProvider)
        setSessionExpiry()
        return result.user
    }

    const signInWithEmail = async (email, password) => {
        await setPersistence(auth, browserLocalPersistence)
        const result = await signInWithEmailAndPassword(auth, email, password)
        setSessionExpiry()
        return result.user
    }

    const signUpWithEmail = async (email, password, name) => {
        await setPersistence(auth, browserLocalPersistence)
        const result = await createUserWithEmailAndPassword(auth, email, password)
        if (name) await updateProfile(result.user, { displayName: name })
        setSessionExpiry()
        return result.user
    }

    const signOut = async () => {
        await firebaseSignOut(auth)
        clearSessionExpiry()
        await updateSessionCookie(null)
        clearDeviceCookie()
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
