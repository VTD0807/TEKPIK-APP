import { NextResponse } from 'next/server'

export function middleware(request) {
    const { pathname } = request.nextUrl
    const token = request.cookies.get('fb-token')?.value
    const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/cms') || pathname.startsWith('/store')
    const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/signin' || pathname === '/sign-in'

    if (isProtectedRoute && !token) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
    }

    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*', '/cms/:path*', '/store/:path*', '/login', '/register', '/signin', '/sign-in'],
}
