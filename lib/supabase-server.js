import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server client — use this in Server Components, Route Handlers, Middleware
export async function createSupabaseServerClient() {
    const cookieStore = await cookies()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        throw new Error('Missing Supabase server environment variables. Please check your .env.local file.')
    }

    return createServerClient(url, key, {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: (cookiesToSet) => {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Called from Server Component — cookies can't be set, middleware handles it
                    }
                },
            },
        }
    )
}

// Public server client — use this for components that don't need user sessions (enables static generation)
export function createSupabasePublicClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        throw new Error('Missing Supabase server environment variables.')
    }

    return createServerClient(url, key, {
        cookies: {},
    })
}

// Get the current session server-side
export async function getServerSession() {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
}
