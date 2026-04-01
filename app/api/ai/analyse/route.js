import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'
import { generateProductAnalysis } from '@/lib/openrouter'

export const dynamic = 'force-dynamic'

export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const snap = await dbAdmin.collection('ai_analysis').where('productId', '==', productId).limit(1).get()
        if (snap.empty) return NextResponse.json({ analysis: null })

        return NextResponse.json({ analysis: { id: snap.docs[0].id, ...snap.docs[0].data() } })
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const { productId } = await req.json()
        if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

        const productSnap = await dbAdmin.collection('products').doc(productId).get()
        if (!productSnap.exists) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

        const product = productSnap.data()
        let categoryName = ''
        if (product.categoryId) {
            const catSnap = await dbAdmin.collection('categories').doc(product.categoryId).get()
            if (catSnap.exists) categoryName = catSnap.data().name
        }

        const result = await generateProductAnalysis({
            title: product.title,
            description: product.description,
            brand: product.brand,
            price: product.price,
            category: categoryName,
        })

        const data = {
            productId,
            summary: result.summary,
            pros: result.pros,
            cons: result.cons,
            whoIsItFor: result.whoIsItFor,
            verdict: result.verdict,
            score: result.score,
            scoreReason: result.scoreReason,
            valueForMoney: result.valueForMoney,
            model: result.model,
            generatedAt: new Date(),
        }

        const snap = await dbAdmin.collection('ai_analysis').where('productId', '==', productId).limit(1).get()
        let analysisId
        if (!snap.empty) {
            analysisId = snap.docs[0].id
            await dbAdmin.collection('ai_analysis').doc(analysisId).update(data)
        } else {
            const res = await dbAdmin.collection('ai_analysis').add(data)
            analysisId = res.id
        }

        const finalSnap = await dbAdmin.collection('ai_analysis').doc(analysisId).get()

        return NextResponse.json({ analysis: { id: finalSnap.id, ...finalSnap.data() } })

    } catch (err) {
        console.error('[AI Analysis] Error:', err.message)
        const isRateLimit = err.message.includes('429') || err.message.includes('rate') || err.message.includes('Rate')
        const status = isRateLimit ? 429 : 500
        const userMessage = isRateLimit
            ? 'AI models are temporarily rate-limited. Please wait 30-60 seconds and try again.'
            : err.message
        return NextResponse.json({ error: userMessage }, { status })
    }
}
