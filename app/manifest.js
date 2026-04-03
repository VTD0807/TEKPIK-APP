import { getSiteUrl } from '@/lib/seo'

export default function manifest() {
    const siteUrl = getSiteUrl()

    return {
        name: 'TEKPIK',
        short_name: 'TEKPIK',
        description: 'AI-powered product discovery and community-driven reviews.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#111827',
        icons: [
            {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/apple-icon.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/logo-tekpik.png',
                sizes: '1200x1200',
                type: 'image/png',
                purpose: 'any',
            },
        ],
        id: siteUrl,
    }
}
