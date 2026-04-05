import { NextResponse } from 'next/server'
import { dbAdmin, sanitizeFirestoreData } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

const FAST_MODELS = [
    'google/gemma-3n-e4b-it:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'openai/gpt-oss-20b:free',
]

const normalizeText = (value = '') => String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const tokenize = (value = '') => normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 1)

const extractJSON = (text) => {
    if (!text) return null
    try {
        return JSON.parse(text)
    } catch (_) {}

    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    try {
        return JSON.parse(cleaned)
    } catch (_) {}

    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
        try {
            return JSON.parse(match[0])
        } catch (_) {}
    }

    return null
}

const toPrice = (value) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : 0
}

const scoreProduct = (product, query, tokens) => {
    const title = normalizeText(product.title || product.name)
    const brand = normalizeText(product.brand)
    const category = normalizeText(product.categories?.name || product.category)
    const desc = normalizeText(product.description)
    const tags = normalizeText(Array.isArray(product.tags) ? product.tags.join(' ') : '')
    const blob = [title, brand, category, desc, tags].join(' ')

    let score = 0
    if (title === query) score += 100
    if (title.startsWith(query)) score += 50
    if (blob.includes(query)) score += 25

    tokens.forEach((token) => {
        if (title.includes(token)) score += 14
        if (brand.includes(token)) score += 10
        if (category.includes(token)) score += 8
        if (desc.includes(token) || tags.includes(token)) score += 4
    })

    const rating = Number(product.reviewSummary?.averageRating || product.rating || product.amazonRating || 0)
    if (Number.isFinite(rating) && rating > 0) score += rating

    const discount = Number(product.discount || 0)
    if (Number.isFinite(discount) && discount > 0) score += Math.min(discount / 3, 12)

    return score
}

async function callOpenRouter(prompt) {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured')

    for (const model of FAST_MODELS) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort('timeout'), 12000)

        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://tekpik.in',
                    'X-Title': 'TEKPIK Ask AI',
                },
                body: JSON.stringify({
                    model,
                    temperature: 0.2,
                    max_tokens: 450,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a shopping recommendation assistant. Return only valid JSON and keep text concise.',
                        },
                        { role: 'user', content: prompt },
                    ],
                }),
                signal: controller.signal,
            })

            clearTimeout(timeoutId)

            if (!res.ok) continue
            const data = await res.json()
            const content = data?.choices?.[0]?.message?.content
            const parsed = extractJSON(content)
            if (!parsed || typeof parsed !== 'object') continue

            return { result: parsed, model }
        } catch (_) {
            clearTimeout(timeoutId)
        }
    }

    throw new Error('All fast OpenRouter models failed')
}

export async function POST(req) {
    try {
        const body = await req.json().catch(() => ({}))
        const queryText = String(body?.query || '').trim()

        if (!queryText) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 })
        }

        if (!dbAdmin) {
            return NextResponse.json({ error: 'Database not initialized' }, { status: 500 })
        }

        const query = normalizeText(queryText)
        const tokens = tokenize(queryText)

        const snapshot = await dbAdmin
            .collection('products')
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(220)
            .get()

        const products = []
        snapshot.forEach((doc) => {
            products.push(sanitizeFirestoreData({ id: doc.id, ...doc.data() }))
        })

        const ranked = products
            .map((product) => ({ product, score: scoreProduct(product, query, tokens) }))
            .filter((entry) => entry.score > 0)
            .sort((a, b) => b.score - a.score)

        const qualifying = ranked.filter((entry) => entry.score >= 18)
        const candidateEntries = (qualifying.length ? qualifying : ranked).slice(0, 6)
        const candidates = candidateEntries.map((entry) => entry.product)

        const candidateContext = candidates.map((p, idx) => {
            const title = p.title || p.name || 'Untitled'
            const price = toPrice(p.price)
            const brand = p.brand || 'Unknown'
            const category = p.categories?.name || p.category || 'General'
            return `${idx + 1}. ${title} | Brand: ${brand} | Category: ${category} | Price: INR ${price}`
        }).join('\n')

        const prompt = candidates.length
            ? `User requirement: "${queryText}"\n\nAvailable matching products:\n${candidateContext}\n\nRespond only in JSON with this shape:\n{\n  "overview": "2-4 sentence recommendation overview",\n  "recommendedTitles": ["title 1", "title 2"],\n  "whyThese": ["reason 1", "reason 2"],\n  "alternativeAdvice": ["optional fallback advice"]\n}\nRules:\n- Recommend up to 3 products from the listed candidates only.\n- Keep overview practical and concise.\n- If confidence is low, say that clearly in overview.`
            : `User requirement: "${queryText}"\nNo qualifying products exist in the current catalog.\nRespond only in JSON with this shape:\n{\n  "overview": "2-4 sentence overview explaining no exact match",\n  "recommendedTitles": [],\n  "whyThese": [],\n  "alternativeAdvice": ["3 practical fallback suggestions"]\n}`

        let ai = null
        let modelUsed = null
        try {
            const response = await callOpenRouter(prompt)
            ai = response.result
            modelUsed = response.model
        } catch (_) {
            ai = null
        }

        const normalizedByTitle = new Map(
            candidates.map((product) => [normalizeText(product.title || product.name || ''), product])
        )

        const aiTitles = Array.isArray(ai?.recommendedTitles) ? ai.recommendedTitles : []
        let selectedProducts = aiTitles
            .map((title) => normalizedByTitle.get(normalizeText(title)))
            .filter(Boolean)

        if (!selectedProducts.length) {
            selectedProducts = candidates.slice(0, 3)
        }

        const hasQualifiedProducts = qualifying.length > 0
        const overview = String(ai?.overview || '').trim() || (hasQualifiedProducts
            ? 'These options are the closest match to your request based on title, brand, category, and rating signals.'
            : 'No exact product currently matches your requirement. I can still guide you with alternatives and what to look for next.')

        const whyThese = Array.isArray(ai?.whyThese) ? ai.whyThese.slice(0, 5) : []
        const alternativeAdvice = Array.isArray(ai?.alternativeAdvice) ? ai.alternativeAdvice.slice(0, 5) : []

        return NextResponse.json({
            query: queryText,
            overview,
            hasQualifiedProducts,
            products: selectedProducts,
            whyThese,
            alternativeAdvice,
            modelUsed: modelUsed || 'rule-based-fallback',
            generatedAt: new Date().toISOString(),
        })
    } catch (error) {
        return NextResponse.json({ error: error.message || 'Failed to process Ask AI request' }, { status: 500 })
    }
}
