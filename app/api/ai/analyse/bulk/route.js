import { NextResponse } from 'next/server'
import { generateProductAnalysis } from '@/lib/openrouter'
import { productDummyData } from '@/assets/assets'

// POST /api/ai/analyse/bulk  — generate analyses for all unanalysed products
export async function POST() {
    // TODO: verify admin session
    // TODO: fetch unanalysed products from Prisma

    const products = productDummyData.slice(0, 3) // limit for demo
    const results = []

    for (const product of products) {
        try {
            const analysis = await generateProductAnalysis({
                title: product.title || product.name,
                description: product.description,
                brand: product.brand || '',
                price: product.price,
                category: product.category,
            })
            results.push({ productId: product.id, success: true, analysis })
            // Rate limit: 1 per 1.5s
            await new Promise(r => setTimeout(r, 1500))
        } catch (err) {
            results.push({ productId: product.id, success: false, error: err.message })
        }
    }

    return NextResponse.json({ results })
}
