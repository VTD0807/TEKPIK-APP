import { NextResponse } from 'next/server'

const CONSOLE_HOSTNAMES = ['console.tekpik.in', 'console.tekpik.com']

// In-memory cache for maintenance mode check (edge-compatible)
let maintenanceCache = { active: false, checkedAt: 0 }
const MAINTENANCE_CACHE_TTL = 30 * 1000 // 30 seconds

async function isMaintenanceModeActive(request) {
    // Env var override — always respected
    if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true') return true
    if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'false') return false

    // Check in-memory cache
    if (Date.now() - maintenanceCache.checkedAt < MAINTENANCE_CACHE_TTL) {
        return maintenanceCache.active
    }

    // Fetch from internal API (this reads from Firestore via the admin downtime route)
    try {
        const baseUrl = request.nextUrl.origin
        const res = await fetch(`${baseUrl}/api/admin/downtime`, {
            headers: { 'x-middleware-check': '1' },
            signal: AbortSignal.timeout(2000), // 2s timeout
        })
        if (res.ok) {
            const data = await res.json()
            maintenanceCache = { active: Boolean(data.maintenanceMode), checkedAt: Date.now() }
            return maintenanceCache.active
        }
    } catch {
        // On fetch failure, use cached value or default to off
    }
    return maintenanceCache.active
}

export async function middleware(request) {
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
    
    if (!isLocalhost) {
        const maintenanceActive = await isMaintenanceModeActive(request)
        
        if (maintenanceActive) {
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
        } else {
            // If maintenance is OFF but user is stuck on /maintenance page, redirect them to home
            if (pathname === '/maintenance') {
                return NextResponse.redirect(new URL('/', request.url))
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
