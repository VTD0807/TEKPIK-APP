import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'
import { generateProductAnalysis } from '@/lib/openrouter'

export const dynamic = 'force-dynamic'

export async function POST() {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const productsSnap = await dbAdmin.collection('products').get()
        const aiSnap = await dbAdmin.collection('ai_analysis').get()
        
        const analysedProductIds = new Set()
        aiSnap.forEach(doc => analysedProductIds.add(doc.data().productId))

        const unanalysed = []
        productsSnap.forEach(doc => {
            if (!analysedProductIds.has(doc.id)) unanalysed.push({ id: doc.id, ...doc.data() })
        })

        const products = unanalysed.slice(0, 5) // limit 5
        const results = []

        const catSnap = await dbAdmin.collection('categories').get()
        const catMap = {}
        catSnap.forEach(doc => catMap[doc.id] = doc.data().name)

        for (const product of products) {
            try {
                const analysis = await generateProductAnalysis({
                    title: product.title,
                    description: product.description,
                    brand: product.brand || '',
                    price: product.price,
                    category: catMap[product.categoryId] || 'General',
                })

                await dbAdmin.collection('ai_analysis').add({
                    productId: product.id,
                    summary: analysis.summary,
                    pros: analysis.pros,
                    cons: analysis.cons,
                    whoIsItFor: analysis.whoIsItFor,
                    verdict: analysis.verdict,
                    score: analysis.score,
                    scoreReason: analysis.scoreReason,
                    valueForMoney: analysis.valueForMoney,
                    model: analysis.model,
                    generatedAt: new Date()
                })

                results.push({ productId: product.id, success: true })
                await new Promise(r => setTimeout(r, 1500))
            } catch (err) {
                results.push({ productId: product.id, success: false, error: err.message })
            }
        }

        return NextResponse.json({ results })
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
