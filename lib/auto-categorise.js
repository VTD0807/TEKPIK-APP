/**
 * lib/auto-categorise.js
 *
 * Auto-categorisation engine.
 * Strategy:
 *   1. Keyword/rule matching against category names + a built-in keyword map (fast, free, ~85% accurate)
 *   2. AI fallback via OpenRouter for products that don't match any rule
 */

const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tekpik.in'

// ─── Built-in keyword → category-name map ────────────────────────────────────
// Keys are lowercase keywords found in product title/description/brand/tags.
// Values are lowercase category name fragments to match against.
const KEYWORD_RULES = [
    // Bags & luggage
    { keywords: ['bag', 'backpack', 'handbag', 'tote', 'sling', 'wallet', 'purse', 'luggage', 'suitcase', 'duffel', 'clutch', 'pouch'], category: 'bags' },
    // Kitchen
    { keywords: ['kitchen', 'cookware', 'pan', 'pot', 'kadai', 'tawa', 'pressure cooker', 'mixer', 'grinder', 'juicer', 'blender', 'microwave', 'oven', 'toaster', 'kettle', 'coffee maker', 'air fryer', 'induction', 'chopper', 'peeler', 'spatula', 'ladle', 'knife', 'cutting board', 'storage container', 'lunch box', 'water bottle', 'flask', 'thermos'], category: 'kitchen' },
    // Electronics
    { keywords: ['laptop', 'computer', 'pc', 'monitor', 'keyboard', 'mouse', 'webcam', 'hard drive', 'ssd', 'ram', 'processor', 'graphics card', 'gpu', 'cpu', 'router', 'modem', 'printer', 'scanner', 'projector', 'ups', 'power bank', 'charger', 'cable', 'adapter', 'hub', 'usb', 'hdmi', 'ethernet'], category: 'electronics' },
    // Mobile & accessories
    { keywords: ['phone', 'smartphone', 'mobile', 'iphone', 'android', 'tablet', 'ipad', 'smartwatch', 'watch', 'earphone', 'earbuds', 'headphone', 'airpods', 'speaker', 'bluetooth', 'case cover', 'screen protector', 'tempered glass', 'phone stand', 'selfie stick'], category: 'mobile' },
    // Clothing & fashion
    { keywords: ['shirt', 't-shirt', 'tshirt', 'jeans', 'trouser', 'pant', 'dress', 'saree', 'kurta', 'kurti', 'lehenga', 'salwar', 'suit', 'jacket', 'hoodie', 'sweater', 'coat', 'blazer', 'shorts', 'skirt', 'leggings', 'innerwear', 'underwear', 'bra', 'socks', 'cap', 'hat', 'scarf', 'gloves', 'belt', 'tie', 'dupatta', 'shawl'], category: 'clothing' },
    // Footwear
    { keywords: ['shoes', 'sneakers', 'sandals', 'slippers', 'boots', 'heels', 'loafers', 'flip flops', 'chappal', 'footwear', 'sports shoes', 'running shoes'], category: 'footwear' },
    // Beauty & personal care
    { keywords: ['shampoo', 'conditioner', 'face wash', 'moisturiser', 'moisturizer', 'sunscreen', 'serum', 'toner', 'foundation', 'lipstick', 'mascara', 'eyeliner', 'blush', 'concealer', 'perfume', 'deodorant', 'body lotion', 'hair oil', 'hair color', 'nail polish', 'razor', 'trimmer', 'epilator', 'face mask', 'scrub', 'cleanser', 'makeup', 'cosmetic', 'skincare', 'haircare'], category: 'beauty' },
    // Health & fitness
    { keywords: ['protein', 'supplement', 'vitamin', 'omega', 'probiotic', 'whey', 'creatine', 'gym', 'dumbbell', 'barbell', 'resistance band', 'yoga mat', 'treadmill', 'cycle', 'fitness', 'health', 'medicine', 'first aid', 'thermometer', 'bp monitor', 'glucometer', 'pulse oximeter', 'weighing scale'], category: 'health' },
    // Home & furniture
    { keywords: ['sofa', 'chair', 'table', 'bed', 'mattress', 'pillow', 'cushion', 'curtain', 'bedsheet', 'blanket', 'towel', 'lamp', 'light', 'fan', 'ac', 'air conditioner', 'refrigerator', 'fridge', 'washing machine', 'vacuum cleaner', 'iron', 'ironing board', 'shelf', 'rack', 'wardrobe', 'cabinet', 'drawer', 'mirror', 'clock', 'photo frame', 'vase', 'carpet', 'rug', 'doormat', 'wall art', 'home decor'], category: 'home' },
    // Books & stationery
    { keywords: ['book', 'novel', 'textbook', 'notebook', 'diary', 'pen', 'pencil', 'marker', 'highlighter', 'stapler', 'scissors', 'tape', 'glue', 'folder', 'file', 'binder', 'stationery', 'art supplies', 'paint', 'canvas', 'sketch'], category: 'books' },
    // Toys & games
    { keywords: ['toy', 'game', 'puzzle', 'lego', 'doll', 'action figure', 'board game', 'card game', 'remote control', 'rc car', 'drone', 'kids', 'children', 'baby', 'infant', 'toddler', 'educational toy', 'building blocks'], category: 'toys' },
    // Sports & outdoors
    { keywords: ['cricket', 'football', 'basketball', 'tennis', 'badminton', 'swimming', 'cycling', 'hiking', 'camping', 'trekking', 'fishing', 'golf', 'hockey', 'volleyball', 'sports', 'outdoor', 'adventure', 'helmet', 'knee pad', 'elbow pad', 'gloves sport'], category: 'sports' },
    // Automotive
    { keywords: ['car', 'bike', 'motorcycle', 'scooter', 'tyre', 'tire', 'engine oil', 'car cover', 'seat cover', 'car charger', 'dash cam', 'gps', 'helmet bike', 'automotive', 'vehicle'], category: 'automotive' },
    // Pet supplies
    { keywords: ['dog', 'cat', 'pet', 'puppy', 'kitten', 'bird', 'fish', 'aquarium', 'pet food', 'pet collar', 'leash', 'pet bed', 'pet toy', 'grooming'], category: 'pets' },
    // Office & work
    { keywords: ['office', 'desk', 'ergonomic', 'standing desk', 'monitor arm', 'cable management', 'whiteboard', 'projector screen', 'conference', 'business card', 'stamp', 'calculator'], category: 'office' },
    // Gaming
    { keywords: ['gaming', 'playstation', 'xbox', 'nintendo', 'ps4', 'ps5', 'controller', 'joystick', 'gaming chair', 'gaming headset', 'gaming mouse', 'gaming keyboard', 'gaming monitor', 'console', 'video game'], category: 'gaming' },
    // Food & grocery
    { keywords: ['food', 'snack', 'biscuit', 'chocolate', 'coffee', 'tea', 'spice', 'masala', 'oil', 'ghee', 'flour', 'rice', 'dal', 'sugar', 'salt', 'sauce', 'pickle', 'jam', 'honey', 'dry fruit', 'nuts', 'grocery', 'organic', 'instant noodles', 'pasta', 'cereal'], category: 'food' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalize = (s = '') => String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Build a searchable text blob from a product.
 */
const productBlob = (product) => normalize([
    product.title,
    product.name,
    product.brand,
    product.description,
    ...(Array.isArray(product.tags) ? product.tags : []),
    product.metaKeywords,
].filter(Boolean).join(' '))

/**
 * Find the best matching category from the existing categories list using keyword rules.
 * Returns { categoryId, categoryName, confidence, method } or null.
 */
export function matchCategoryByKeywords(product, categories) {
    const blob = productBlob(product)
    if (!blob) return null

    const scores = new Map() // categoryId → score

    for (const rule of KEYWORD_RULES) {
        // Find which existing category this rule maps to
        const matchedCat = categories.find((cat) => {
            const catName = normalize(cat.name)
            const catSlug = normalize(cat.slug || '')
            return catName.includes(rule.category) || rule.category.includes(catName) || catSlug.includes(rule.category)
        })
        if (!matchedCat) continue

        let ruleScore = 0
        for (const kw of rule.keywords) {
            if (blob.includes(kw)) {
                // Longer keyword = more specific = higher weight
                ruleScore += 1 + (kw.length / 20)
            }
        }

        if (ruleScore > 0) {
            scores.set(matchedCat.id, (scores.get(matchedCat.id) || 0) + ruleScore)
        }
    }

    if (scores.size === 0) return null

    // Pick highest scoring category
    const [bestId, bestScore] = Array.from(scores.entries()).sort((a, b) => b[1] - a[1])[0]
    const bestCat = categories.find((c) => c.id === bestId)
    if (!bestCat) return null

    // Confidence: normalize score to 0-1 range (cap at 1)
    const confidence = Math.min(bestScore / 5, 1)

    return {
        categoryId: bestId,
        categoryName: bestCat.name,
        confidence,
        method: 'keyword',
    }
}

/**
 * Use AI to categorise a product when keyword matching fails or confidence is low.
 * Returns { categoryId, categoryName, confidence, method } or null.
 */
export async function matchCategoryByAI(product, categories) {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) return null

    const categoryList = categories.map((c) => `- ${c.name} (id: ${c.id})`).join('\n')
    const prompt = `You are a product categorisation assistant. Given a product, pick the single most appropriate category from the list below.

Product:
- Title: ${product.title || product.name || ''}
- Brand: ${product.brand || ''}
- Description: ${String(product.description || '').slice(0, 300)}
- Tags: ${(Array.isArray(product.tags) ? product.tags : []).join(', ')}

Available categories:
${categoryList}

Respond with ONLY a JSON object like:
{"categoryId": "<id from list>", "categoryName": "<name>", "confidence": 0.9}

Rules:
- confidence must be 0.0 to 1.0
- if no category fits well, set confidence below 0.4
- return ONLY the JSON, no explanation`

    const models = [
        'meta-llama/llama-3.3-70b-instruct:free',
        'google/gemma-3-12b-it:free',
        'meta-llama/llama-3.2-3b-instruct:free',
    ]

    for (const model of models) {
        try {
            const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': APP_URL,
                    'X-Title': 'TEKPIK',
                },
                body: JSON.stringify({
                    model,
                    temperature: 0.1,
                    max_tokens: 128,
                    messages: [
                        { role: 'system', content: 'You are a product categorisation assistant. Respond with valid JSON only.' },
                        { role: 'user', content: prompt },
                    ],
                }),
            })

            if (!res.ok) continue

            const data = await res.json()
            const content = data.choices?.[0]?.message?.content?.trim()
            if (!content) continue

            // Parse JSON
            let parsed = null
            try { parsed = JSON.parse(content) } catch {
                const m = content.match(/\{[\s\S]*\}/)
                if (m) try { parsed = JSON.parse(m[0]) } catch {}
            }

            if (!parsed?.categoryId) continue

            // Verify the returned categoryId actually exists
            const matched = categories.find((c) => c.id === parsed.categoryId)
            if (!matched) continue

            return {
                categoryId: matched.id,
                categoryName: matched.name,
                confidence: Math.min(Math.max(Number(parsed.confidence) || 0.7, 0), 1),
                method: 'ai',
            }
        } catch {
            continue
        }
    }

    return null
}

/**
 * Main entry point.
 * Returns the best category match for a product, or null if nothing fits.
 * @param {object} product
 * @param {Array<{id, name, slug}>} categories
 * @param {{ minConfidence?: number, forceAI?: boolean }} options
 */
export async function autoCategories(product, categories, { minConfidence = 0.3, forceAI = false } = {}) {
    if (!categories?.length) return null

    // Skip if already categorised (unless forced)
    if (product.categoryId && !forceAI) return null

    // 1. Try keyword matching first
    if (!forceAI) {
        const kwMatch = matchCategoryByKeywords(product, categories)
        if (kwMatch && kwMatch.confidence >= minConfidence) {
            return kwMatch
        }
    }

    // 2. Fall back to AI
    const aiMatch = await matchCategoryByAI(product, categories)
    if (aiMatch && aiMatch.confidence >= minConfidence) {
        return aiMatch
    }

    return null
}
