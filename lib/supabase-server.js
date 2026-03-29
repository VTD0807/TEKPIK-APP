import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server client — use this in Server Components, Route Handlers, Middleware
export async function createSupabaseServerClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
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

// Get the current session server-side
export async function getServerSession() {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
}
