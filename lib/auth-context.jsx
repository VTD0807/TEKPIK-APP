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
import { doc, setDoc } from 'firebase/firestore'
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

// Sync Firebase user directly to Firestore
async function syncUserToFirestore(firebaseUser) {
    if (!firebaseUser?.uid || !firebaseUser?.email) return

    const payload = {
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0] || 'User',
        email: firebaseUser.email,
        image: firebaseUser.photoURL || '',
    }
    if (isAdminEmail(firebaseUser.email)) payload.role = 'ADMIN'

    try {
        await setDoc(doc(db, 'users', firebaseUser.uid), payload, { merge: true })
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
            document.cookie = `fb-token=${token}; path=/; max-age=3600; SameSite=Lax`
        } catch (e) {
            console.warn('Failed to set session cookie:', e.message)
        }
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
                Promise.allSettled([
                    syncUserToFirestore(firebaseUser),
                    updateSessionCookie(firebaseUser),
                ])
            } else {
                updateSessionCookie(null).catch(() => {})
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

