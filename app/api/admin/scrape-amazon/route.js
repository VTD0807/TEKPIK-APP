import { NextResponse } from 'next/server'
import { scrapeAmazonProduct } from '@/lib/amazon-scraper'

export const dynamic = 'force-dynamic'

export async function POST(req) {
    try {
        const body = await req.json().catch(() => ({}))
        const product = await scrapeAmazonProduct(body?.url)

        return NextResponse.json({
            product,
        })
    } catch (error) {
        return NextResponse.json({ error: error.message || 'Failed to scrape Amazon product.' }, { status: 500 })
    }
}
