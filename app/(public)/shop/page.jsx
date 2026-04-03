import ShopCatalogClient from '@/components/ShopCatalogClient'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: "Shop All Products - TEKPIK",
    description: "Browse our full catalog of AI-analyzed products.",
}

export default async function ShopPage({ searchParams }) {
    const params = await searchParams
    return <ShopCatalogClient initialSearch={params?.search || ''} />
}
