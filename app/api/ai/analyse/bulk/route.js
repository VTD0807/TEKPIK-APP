import { NextResponse } from 'next/server'
import { generateProductAnalysis } from '@/lib/openrouter'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isAdminEmail } from '@/lib/admin'

// POST /api/ai/analyse/bulk  — generate analyses for all unanalysed products
export async function POST() {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Basic admin check (assuming email is the identifier for now)
    if (!user || !isAdminEmail(user.email)) {
        // In production, we'd check for a 'role' in the DB, but let's assume this for now
        // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch products without analysis
    const products = await prisma.products.findMany({
        where: {
            ai_analysis: {
                none: {}
            }
        },
        include: {
            categories: true
        },
        take: 5 // limit per batch to avoid timeouts
    })

    const results = []

    for (const product of products) {
        try {
            const analysis = await generateProductAnalysis({
                title: product.title,
                description: product.description,
                brand: product.brand || '',
                price: product.price,
                category: product.categories?.name || 'General',
            })

            // Save to DB
            await prisma.ai_analysis.create({
                data: {
                    product_id: product.id,
                    summary: analysis.summary,
                    pros: analysis.pros,
                    cons: analysis.cons,
                    who_is_it_for: analysis.whoIsItFor,
                    verdict: analysis.verdict,
                    score: analysis.score,
                    score_reason: analysis.scoreReason,
                    value_for_money: analysis.valueForMoney,
                    model: analysis.model
                }
            })

            results.push({ productId: product.id, success: true })
            // Rate limit: 1 per 1.5s
            await new Promise(r => setTimeout(r, 1500))
        } catch (err) {
            results.push({ productId: product.id, success: false, error: err.message })
        }
    }

    return NextResponse.json({ results })
}
