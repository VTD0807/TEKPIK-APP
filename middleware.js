import { NextResponse } from 'next/server'

export function middleware(request) {
    const { pathname } = request.nextUrl
    const token = request.cookies.get('fb-token')?.value

    if ((pathname.startsWith('/admin') || pathname.startsWith('/cms')) && !token) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*', '/cms/:path*'],
}
