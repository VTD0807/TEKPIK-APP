'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext({ user: null, loading: true, signOut: async () => {} })

async function upsertUserProfile(user) {
    if (!user) return
    await supabase.from('users').upsert({
        id: user.id,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
        email: user.email || '',
        image: user.user_metadata?.avatar_url || '',
    }, { onConflict: 'id', ignoreDuplicates: false })
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Get initial session
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user ?? null)
            setLoading(false)
        })

        // Listen for all auth events
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const u = session?.user ?? null
            setUser(u)

            // On sign-in (including Google OAuth), upsert profile into public.users
            if (event === 'SIGNED_IN' && u) {
                upsertUserProfile(u)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
