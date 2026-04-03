import { NextResponse } from 'next/server'

// Generate AI-powered search results
export async function POST(request) {
    try {
        const { query, products = [] } = await request.json()

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 })
        }

        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
        if (!OPENROUTER_API_KEY) {
            return NextResponse.json(
                { error: 'AI service not configured' },
                { status: 500 }
            )
        }

        // Prepare context from products
        const productContext = products
            .slice(0, 5)
            .map(p => `- ${p.title || p.name} (${p.price || 'N/A'})`)
            .join('\n')

        const prompt = `You are a helpful shopping assistant. Generate a concise, informative answer about: "${query}"

${productContext ? `Context products:\n${productContext}\n` : ''}

Provide:
1. A brief answer (2-3 sentences)
2. 3-4 key points as bullet points
3. 2-3 practical recommendations
4. A confidence level (0-1)

Format as JSON with keys: answer, keyPoints[], recommendations[], confidence`

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                'X-Title': 'TEKPIK',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.3-70b-instruct:free',
                messages: [{
                    role: 'user',
                    content: prompt,
                }],
                temperature: 0.7,
                max_tokens: 500,
            }),
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('OpenRouter error:', error)
            throw new Error(`AI service error: ${response.status}`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content

        if (!content) {
            throw new Error('No response from AI service')
        }

        // Parse JSON response
        let result
        try {
            // Extract JSON from response (in case there's extra text)
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            result = JSON.parse(jsonMatch ? jsonMatch[0] : content)
        } catch {
            // Fallback: structure the response manually
            result = {
                answer: content,
                keyPoints: [],
                recommendations: [],
                confidence: 0.8,
            }
        }

        // Ensure proper structure
        return NextResponse.json({
            answer: result.answer || 'I found relevant information for your query.',
            keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
            recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
            confidence: typeof result.confidence === 'number' ? result.confidence : 0.8,
            sources: ['TEKPIK AI', 'Product Database'],
            generated_at: new Date().toISOString(),
        })

    } catch (error) {
        console.error('AI generation error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate AI response' },
            { status: 500 }
        )
    }
}
