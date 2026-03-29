import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh session
    const { data: { user } } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    // Protect /admin routes — redirect to login if not authenticated
    if (path.startsWith('/admin')) {
        if (!user) {
            const loginUrl = new URL('/login', request.url)
            loginUrl.searchParams.set('redirect', path)
            return NextResponse.redirect(loginUrl)
        }
    }

    // Redirect logged-in users away from login/register
    if ((path === '/login' || path === '/register') && user) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return supabaseResponse
}

export const config = {
    matcher: ['/admin/:path*', '/login', '/register', '/wishlist', '/oauth/:path*'],
}
