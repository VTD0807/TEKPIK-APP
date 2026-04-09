import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const workspaceRoot = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'm.media-amazon.com' },
            { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
            { protocol: 'https', hostname: 'images-eu.ssl-images-amazon.com' },
            { protocol: 'https', hostname: 'ooqens.web.app' },
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
        ],
    },
    // Reduce bundle size
    experimental: {
        optimizePackageImports: ['firebase'],
    },
    turbopack: {
        root: workspaceRoot,
    },
    // Compress responses
    compress: true,
    async headers() {
        return [
            {
                source: '/_next/static/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                ],
            },
            {
                source: '/assets/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
                ],
            },
            {
                source: '/api/products',
                headers: [
                    { key: 'Cache-Control', value: 'public, s-maxage=120, stale-while-revalidate=300' },
                ],
            },
            {
                source: '/api/products/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, s-maxage=120, stale-while-revalidate=300' },
                ],
            },
            {
                source: '/api/recommendations/feed',
                headers: [
                    { key: 'Cache-Control', value: 'public, s-maxage=120, stale-while-revalidate=300' },
                ],
            },
            {
                source: '/admin/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
                    { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
                ],
            },
            {
                source: '/cms/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
                    { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
                ],
            },
            {
                source: '/store/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
                    { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
                ],
            },
            {
                source: '/e/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
                    { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
                ],
            },
            {
                source: '/api/:path*',
                headers: [
                    { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
                ],
            },
        ]
    },
}

export default nextConfig
