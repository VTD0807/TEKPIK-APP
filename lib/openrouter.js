const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'TEKPIK'

/**
 * Generate an AI analysis for a product.
 * Returns a structured JSON object or throws on failure.
 */
export async function generateProductAnalysis({ title, description, brand, price, category }) {
    const prompt = `You are an honest, neutral product analyst. Analyse the following product and return ONLY a valid JSON object — no markdown, no code fences, no extra text.

Product:
- Title: ${title}
- Brand: ${brand || 'Unknown'}
- Category: ${category}
- Price: $${price}
- Description: ${description}

Return this exact JSON structure:
{
  "summary": "2-3 sentence plain English overview",
  "pros": ["advantage 1", "advantage 2", "advantage 3", "advantage 4"],
  "cons": ["disadvantage 1", "disadvantage 2", "disadvantage 3"],
  "whoIsItFor": "Description of the ideal buyer",
  "verdict": "One definitive sentence verdict",
  "score": 7,
  "scoreReason": "Why this score",
  "valueForMoney": "Good"
}

Rules:
- score must be an integer 1-10
- valueForMoney must be one of: "Excellent", "Good", "Average", "Poor"
- pros must have 4-6 items
- cons must have 3-4 items
- Return ONLY the JSON object, nothing else`

    const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': APP_URL,
            'X-Title': APP_NAME,
        },
        body: JSON.stringify({
            model: OPENROUTER_MODEL,
            temperature: 0.3,
            messages: [{ role: 'user', content: prompt }],
        }),
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`OpenRouter error ${res.status}: ${err}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) throw new Error('Empty response from OpenRouter')

    // Strip any accidental markdown fences
    const clean = content.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()

    const parsed = JSON.parse(clean)
    return { ...parsed, model: OPENROUTER_MODEL }
}
