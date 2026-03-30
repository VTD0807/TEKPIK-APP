'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { 
    onAuthStateChanged, 
    signOut as firebaseSignOut, 
    signInWithPopup, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile,
    getIdToken
} from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { supabase } from '@/lib/supabase'
import { isAdminEmail } from '@/lib/admin'

const AuthContext = createContext({ 
    user: null, 
    loading: true, 
    signInWithGoogle: async () => {}, 
    signInWithEmail: async () => {}, 
    signUpWithEmail: async () => {}, 
    signOut: async () => {} 
})

// Sync Firebase user to Supabase public.users table for relational data (reviews, wishlist)
async function syncUserToSupabase(firebaseUser) {
    if (!firebaseUser || !firebaseUser.uid) return
    if (!firebaseUser.email) return

    const payload = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
        email: firebaseUser.email || '',
        image: firebaseUser.photoURL || '',
    }
    if (isAdminEmail(firebaseUser.email)) payload.role = 'ADMIN'

    try {
        const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' })
        if (error) {
            const details = [error.message, error.details, error.hint].filter(Boolean).join(' | ')
            console.warn('Supabase user sync skipped:', details || error)
        }
    } catch (err) {
        const message = err?.message || err
        console.warn('Supabase user sync failed:', message)
    }
}

// Set or remove session cookie for server-side auth (middleware)
async function updateSessionCookie(firebaseUser) {
    if (firebaseUser) {
        const token = await getIdToken(firebaseUser)
        // Set cookie via a small API route or client-side cookie library
        // For simplicity and stability, we'll use a client-side approach that middleware can read
        document.cookie = `fb-token=${token}; path=/; max-age=3600; SameSite=Lax`
    } else {
        document.cookie = `fb-token=; path=/; max-age=0; SameSite=Lax`
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser)
            setLoading(false)
            
            if (firebaseUser) {
                // Sync profile and update server session cookie
                syncUserToSupabase(firebaseUser).catch(console.error)
                updateSessionCookie(firebaseUser).catch(console.error)
            } else {
                updateSessionCookie(null).catch(console.error)
            }
        })
        return unsub
    }, [])

    const signInWithGoogle = async () => {
        const result = await signInWithPopup(auth, googleProvider)
        return result.user
    }

    const signInWithEmail = async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, email, password)
        return result.user
    }

    const signUpWithEmail = async (email, password, name) => {
        const result = await createUserWithEmailAndPassword(auth, email, password)
        if (name) await updateProfile(result.user, { displayName: name })
        return result.user
    }

    const signOut = async () => {
        await firebaseSignOut(auth)
        await updateSessionCookie(null)
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
