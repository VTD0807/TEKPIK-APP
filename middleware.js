import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
    const path = request.nextUrl.pathname

    // Only run auth check on protected routes — skip everything else
    const isAdminRoute = path.startsWith('/admin')
    const isAuthRoute = path === '/login' || path === '/register'

    // OAuth routes — always pass through immediately
    if (path.startsWith('/oauth')) {
        return NextResponse.next({ request })
    }

    // Only hit Supabase when actually needed
    if (!isAdminRoute && !isAuthRoute) {
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'),
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

    const { data: { user } } = await supabase.auth.getUser()

    if (isAdminRoute && !user) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', path)
        return NextResponse.redirect(loginUrl)
    }

    return supabaseResponse
}

export const config = {
    matcher: ['/admin/:path*', '/wishlist', '/oauth/:path*'],
}
