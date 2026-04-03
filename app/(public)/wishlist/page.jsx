import WishlistClient from './WishlistClient'
import { absoluteUrl } from '@/lib/seo'

const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'TEKPIK'

export async function generateMetadata() {
    const title = `Your Wishlist | ${STORE_NAME}`
    const description = `View your saved products and revisit your shortlisted picks on ${STORE_NAME}.`
    const canonical = absoluteUrl('/wishlist')

    return {
        title,
        description,
        alternates: {
            canonical,
        },
        robots: {
            index: false,
            follow: true,
        },
    }
}

export default function WishlistPage() {
    return <WishlistClient />
}
