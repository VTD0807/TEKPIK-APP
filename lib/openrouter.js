const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tekpik.in'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'TEKPIK'

// Large pool of free models across DIFFERENT providers to avoid shared rate limits.
// The primary model from env is always tried first; the rest are shuffled.
const FREE_MODEL_POOL = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-3-12b-it:free',
    'google/gemma-3-4b-it:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'qwen/qwen3-coder:free',
    'nvidia/nemotron-nano-9b-v2:free',
    'google/gemma-3n-e4b-it:free',
    'openai/gpt-oss-20b:free',
]

/**
 * Shuffle array in place (Fisher-Yates).
 */
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

/**
 * Extract JSON from a string that may contain markdown fences or extra text.
 */
function extractJSON(text) {
    if (!text) return null

    // Try direct parse first
    try { return JSON.parse(text) } catch {}

    // Strip markdown code fences
    let clean = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    try { return JSON.parse(clean) } catch {}

    // Try to find JSON object in the text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
        try { return JSON.parse(jsonMatch[0]) } catch {}
    }

    return null
}

/**
 * Sleep for ms milliseconds.
 */
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * Call OpenRouter with a specific model.
 * Retries up to `maxRetries` times on 429 with exponential backoff.
 * Returns the parsed JSON or throws.
 */
async function callOpenRouter(model, prompt, maxRetries = 2) {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': APP_URL,
                'X-Title': APP_NAME,
            },
            body: JSON.stringify({
                model,
                temperature: 0.3,
                max_tokens: 1024,
                messages: [
                    { role: 'system', content: 'You are a product analyst. Always respond with valid JSON only. No markdown, no explanation.' },
                    { role: 'user', content: prompt },
                ],
            }),
        })

        // Handle 429 rate limit: wait and retry with exponential backoff
        if (res.status === 429) {
            if (attempt < maxRetries) {
                // Respect Retry-After header if present, otherwise use exponential backoff
                const retryAfter = res.headers.get('retry-after')
                const waitMs = retryAfter
                    ? Math.min(parseInt(retryAfter) * 1000, 30000)
                    : Math.min(3000 * Math.pow(2, attempt), 15000)
                console.log(`[OpenRouter] 429 on ${model}, retry ${attempt + 1}/${maxRetries} in ${waitMs}ms`)
                await sleep(waitMs)
                continue
            }
            // All retries exhausted for this model
            throw new Error(`Rate limited (429) on ${model} after ${maxRetries} retries`)
        }

        if (!res.ok) {
            const errText = await res.text().catch(() => 'Unknown error')
            throw new Error(`OpenRouter ${res.status}: ${errText}`)
        }

        const data = await res.json()

        // Check for OpenRouter-level errors in the response body
        if (data.error) {
            const errMsg = data.error.message || JSON.stringify(data.error)
            // Some 429s come as 200 with error in body
            if (data.error.code === 429 && attempt < maxRetries) {
                const waitMs = Math.min(3000 * Math.pow(2, attempt), 15000)
                console.log(`[OpenRouter] Soft 429 on ${model}, retry ${attempt + 1}/${maxRetries} in ${waitMs}ms`)
                await sleep(waitMs)
                continue
            }
            throw new Error(`OpenRouter API error: ${errMsg}`)
        }

        const content = data.choices?.[0]?.message?.content?.trim()
        if (!content) throw new Error('Empty response from OpenRouter')

        const parsed = extractJSON(content)
        if (!parsed) throw new Error(`Failed to parse JSON from response: ${content.slice(0, 200)}`)

        // Validate required fields
        if (!parsed.summary || !parsed.pros || !parsed.cons || typeof parsed.score !== 'number') {
            throw new Error('Response missing required fields (summary, pros, cons, score)')
        }

        return parsed
    }

    throw new Error(`Exhausted retries for ${model}`)
}

/**
 * Generate an AI analysis for a product.
 * Tries the configured model first, then shuffled fallback models.
 * Each model gets retried on 429 with exponential backoff.
 * Returns a structured JSON object or throws on failure.
 */
export async function generateProductAnalysis({ title, description, brand, price, category }) {
    const prompt = `Analyse the following product and return ONLY a valid JSON object.

Product:
- Title: ${title}
- Brand: ${brand || 'Unknown'}
- Category: ${category}
- Price: $${price}
- Description: ${(description || '').slice(0, 500)}

Return this exact JSON structure:
{
  "summary": "2-3 sentence plain English overview",
  "pros": ["advantage 1", "advantage 2", "advantage 3", "advantage 4"],
  "cons": ["disadvantage 1", "disadvantage 2", "disadvantage 3"],
  "whoIsItFor": "Description of the ideal buyer",
  "verdict": "One definitive sentence verdict",
    "score": 1,
  "scoreReason": "Why this score",
  "valueForMoney": "Good"
}

Rules:
- score must be an integer 1-10
- do not default to 7; choose score from evidence in title/description/price and use wider spread across products
- valueForMoney must be one of: "Excellent", "Good", "Average", "Poor"
- pros must have 4-6 items
- cons must have 3-4 items
- Return ONLY the JSON object, nothing else`

    // Build model list: primary first, then shuffled pool (deduplicated)
    const fallbacks = shuffle(FREE_MODEL_POOL.filter(m => m !== OPENROUTER_MODEL))
    const modelsToTry = [OPENROUTER_MODEL, ...fallbacks]

    const errors = []

    for (const model of modelsToTry) {
        try {
            console.log(`[OpenRouter] Trying model: ${model}`)
            const parsed = await callOpenRouter(model, prompt)
            console.log(`[OpenRouter]  Success with model: ${model}`)
            return { ...parsed, model }
        } catch (err) {
            errors.push({ model, error: err.message })
            console.warn(`[OpenRouter]  ${model}: ${err.message}`)
            // Brief pause before trying next model (different provider)
            await sleep(1000)
        }
    }

    // All models failed — provide a detailed error
    const errorSummary = errors.map(e => `${e.model}: ${e.error}`).join(' | ')
    throw new Error(`All ${modelsToTry.length} OpenRouter models failed. Errors: ${errorSummary}`)
}
