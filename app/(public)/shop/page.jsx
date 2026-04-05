import ShopCatalogClient from '@/components/ShopCatalogClient'
import { absoluteUrl } from '@/lib/seo'

export const dynamic = 'force-dynamic'

const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'TEKPIK'

const humanizeCategory = (value = '') => String(value)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase())

export async function generateMetadata({ searchParams }) {
    const params = await searchParams
    const rawCategory = String(params?.category || '').trim()
    const title = rawCategory
        ? `Best ${humanizeCategory(rawCategory)} in India 2026 | ${STORE_NAME}`
        : `${STORE_NAME} - Best Products at Best Prices in India`
    const description = rawCategory
        ? `Discover and compare top ${humanizeCategory(rawCategory)} products in India on ${STORE_NAME}.`
        : `Browse AI-ranked products, compare prices, and find the best picks in India on ${STORE_NAME}.`
    const canonical = rawCategory
        ? absoluteUrl(`/shop?category=${encodeURIComponent(rawCategory)}`)
        : absoluteUrl('/shop')
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

export default async function ShopPage({ searchParams }) {
    const params = await searchParams
    return <ShopCatalogClient initialSearch={params?.search || ''} />
}
