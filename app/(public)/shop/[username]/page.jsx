import StoreShopClient from './StoreShopClient'
import { getCategoriesMap } from '@/lib/db-queries'
import { absoluteUrl } from '@/lib/seo'

const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'TEKPIK'

const humanizeSlug = (value = '') => String(value)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase())

export async function generateMetadata({ params }) {
    const { username } = await params
    let categoryName = humanizeSlug(username)

    try {
        const categoriesMap = await getCategoriesMap()
        const category = Object.values(categoriesMap || {}).find(c => c.slug === username)
        if (category) {
            categoryName = String(category.name || categoryName)
        }
    } catch (_) {
        // Keep slug-based fallback.
    }

    const title = `Best ${categoryName} in India 2026 | ${STORE_NAME}`
    const description = `Compare the best ${categoryName} options in India with updated prices, ratings, and affiliate picks on ${STORE_NAME}.`
    const canonical = absoluteUrl(`/shop/${encodeURIComponent(username)}`)
    const ogImage = absoluteUrl('/logo-tekpik.png')

    return {
        title,
        description,
        alternates: {
            canonical,
        },
        openGraph: {
            title,
            description,
            url: canonical,
            type: 'website',
            images: [{ url: ogImage }],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImage],
        },
    }
}

export default function StoreShop() {
    return <StoreShopClient />
}