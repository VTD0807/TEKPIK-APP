import { NextResponse } from 'next/server'

const CONSOLE_HOSTNAMES = ['console.tekpik.in', 'console.tekpik.com']

export function middleware(request) {
    const { pathname } = request.nextUrl
    const hostname = request.headers.get('host') || ''

    // console.tekpik.in — rewrite to /admin paths transparently
    const isConsoleSubdomain = CONSOLE_HOSTNAMES.some((h) => hostname === h || hostname.startsWith(`${h}:`))
    if (isConsoleSubdomain) {
        const token = request.cookies.get('fb-token')?.value

        // Map / → /admin, /products → /admin/products, etc.
        const adminPath = pathname === '/' ? '/admin' : `/admin${pathname}`
        const url = request.nextUrl.clone()
        url.pathname = adminPath

        if (!token) {
            const loginUrl = request.nextUrl.clone()
            loginUrl.pathname = '/login'
            loginUrl.searchParams.set('redirect', adminPath)
            return NextResponse.redirect(loginUrl)
        }

        return NextResponse.rewrite(url)
    }

    const token = request.cookies.get('fb-token')?.value
    const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/cms') || pathname.startsWith('/store') || pathname.startsWith('/e')
    const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/signin' || pathname === '/sign-in'

    if (isProtectedRoute && !token) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
    }

    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    // ── Maintenance Mode Check ────────────────────────────────────────────────
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1')
    
    if (!isLocalhost && process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true') {
        const isMaintenanceRoute = pathname === '/maintenance'
        const isApiRoute = pathname.startsWith('/api')
        const isNextInternal = pathname.startsWith('/_next')
        const isStaticAsset = pathname.endsWith('.webmanifest') || pathname.endsWith('.json') || pathname.endsWith('.png') || pathname.endsWith('.ico') || pathname.endsWith('.txt')

        // If it's a public facing route and not already on the maintenance page
        if (!isProtectedRoute && !isAuthRoute && !isMaintenanceRoute && !isApiRoute && !isNextInternal && !isStaticAsset) {
            let isAdmin = false
            if (token) {
                try {
                    // Quick edge-compatible JWT decode to check for admin emails
                    const payload = JSON.parse(atob(token.split('.')[1]))
                    const email = (payload.email || '').toLowerCase().trim()
                    if (email === 'varshith.code@gmail.com' || email === 'varshithpaladugu07@gmail.com') {
                        isAdmin = true
                    }
                } catch(e) {}
            }

            // If not an admin, force redirect to maintenance page
            if (!isAdmin) {
                const url = request.nextUrl.clone()
                url.pathname = '/maintenance'
                return NextResponse.redirect(url)
            }
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
