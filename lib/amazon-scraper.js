import { load } from 'cheerio'

const AMAZON_HOST = /(^|\.)amazon\./i

export const normalizeAmazonUrl = (value = '') => {
    const raw = String(value || '').trim()
    if (!raw) return ''
    if (/^https?:\/\//i.test(raw)) return raw
    return `https://${raw}`
}

export const isAllowedAmazonUrl = (urlString) => {
    try {
        const url = new URL(urlString)
        return /(^|\.)amzn\.to$/i.test(url.hostname) || AMAZON_HOST.test(url.hostname)
    } catch {
        return false
    }
}

const toText = (value = '') => String(value || '').replace(/\s+/g, ' ').trim()

const safeJsonParse = (value) => {
    if (!value) return null
    try {
        return JSON.parse(value)
    } catch {
        return null
    }
}

const flattenArray = (value) => {
    if (Array.isArray(value)) return value.flatMap(flattenArray)
    return value ? [value] : []
}

const firstNonEmpty = (...values) => {
    const junkTitles = ['amazon', 'amazon.in', 'untitled', 'products', 'shop']
    for (const value of values) {
        const cleaned = toText(value).trim()
        if (!cleaned) continue
        if (junkTitles.includes(cleaned.toLowerCase())) continue
        return cleaned
    }
    return ''
}

const parseAmount = (value = '') => {
    const cleaned = String(value || '')
        .replace(/[^\d.,]/g, '')
        .replace(/,/g, '')
        .trim()

    if (!cleaned) return null
    const parsed = Number.parseFloat(cleaned)
    return Number.isFinite(parsed) ? parsed : null
}

const parseAmountLoose = (value = '') => {
    const raw = String(value || '').trim()
    if (!raw) return null

    const numeric = raw.replace(/[^\d.,]/g, '').trim()
    if (!numeric) return null

    const lastComma = numeric.lastIndexOf(',')
    const lastDot = numeric.lastIndexOf('.')
    let normalized = numeric

    if (lastComma > -1 && lastDot > -1) {
        if (lastComma > lastDot) {
            normalized = numeric.replace(/\./g, '').replace(',', '.')
        } else {
            normalized = numeric.replace(/,/g, '')
        }
    } else if (lastComma > -1) {
        normalized = numeric.replace(/,/g, '')
    }

    const parsed = Number.parseFloat(normalized)
    return Number.isFinite(parsed) ? parsed : null
}

const extractAsinFromUrl = (urlString = '') => {
    const match = String(urlString).match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)
    return match?.[1]?.toUpperCase() || ''
}

const buildDescriptionHtml = (bullets = []) => {
    const escaped = bullets.map((item) => String(item)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;'))

    if (!escaped.length) return ''
    return `<ul>${escaped.map((item) => `<li>${item}</li>`).join('')}</ul>`
}

const isLikelyBlockedPage = (html = '', $) => {
    const signals = [
        'enter the characters you see below',
        'sorry, we just need to make sure you\'re not a robot',
        'robot check',
        'captcha',
        '/errors/validatecaptcha',
    ]

    const haystack = `${toText($('title').text())} ${String(html || '').toLowerCase()}`
    return signals.some((signal) => haystack.includes(signal))
}

const extractFromJsonLd = ($) => {
    const scripts = $('script[type="application/ld+json"]').toArray()
    if (!scripts.length) return {}

    const parsedNodes = []
    for (const node of scripts) {
        const parsed = safeJsonParse($(node).contents().text())
        if (!parsed) continue
        parsedNodes.push(...flattenArray(parsed))
    }

    const productNode = parsedNodes.find((node) => {
        const type = node?.['@type']
        if (Array.isArray(type)) return type.some((t) => String(t).toLowerCase() === 'product')
        return String(type || '').toLowerCase() === 'product'
    }) || {}

    const offers = productNode.offers || {}
    const firstOffer = Array.isArray(offers) ? (offers[0] || {}) : offers
    const aggregateRating = productNode.aggregateRating || {}

    return {
        title: firstNonEmpty(productNode.name),
        priceText: firstNonEmpty(firstOffer.price, firstOffer.lowPrice, firstOffer.highPrice),
        originalPriceText: firstNonEmpty(firstOffer.highPrice),
        ratingText: firstNonEmpty(aggregateRating.ratingValue),
        reviewsText: firstNonEmpty(aggregateRating.reviewCount),
        imageUrl: firstNonEmpty(Array.isArray(productNode.image) ? productNode.image[0] : productNode.image),
        bullets: Array.isArray(productNode.description)
            ? productNode.description.map((item) => toText(item)).filter(Boolean)
            : [],
    }
}

const extractPriceByRegex = (html = '', keys = []) => {
    for (const key of keys) {
        const patterns = [
            new RegExp(`"${key}"\\s*:\\s*"([^\"]+)"`, 'i'),
            new RegExp(`"${key}"\\s*:\\s*([0-9][0-9.,]*)`, 'i'),
        ]

        for (const pattern of patterns) {
            const match = String(html || '').match(pattern)
            if (match?.[1]) return match[1]
        }
    }
    return ''
}

export async function scrapeAmazonProduct(sourceUrl) {
    const rawUrl = String(sourceUrl || '').trim()
    const inputUrl = normalizeAmazonUrl(rawUrl)

    if (!inputUrl || !isAllowedAmazonUrl(inputUrl)) {
        throw new Error('Please provide a valid Amazon or amzn.to URL.')
    }

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Referer': 'https://www.google.com/',
        'Cache-Control': 'no-cache',
    }

    const response = await fetch(inputUrl, {
        method: 'GET',
        headers,
        redirect: 'follow',
        cache: 'no-store',
    })

    if (!response.ok) {
        throw new Error(`Amazon request failed with status ${response.status}.`)
    }

    const finalUrl = response.url || inputUrl
    const html = await response.text()
    const $ = load(html)

    if (isLikelyBlockedPage(html, $)) {
        throw new Error('Amazon blocked this request (captcha/robot check). Try again later or use a different network/server region.')
    }

    const jsonLd = extractFromJsonLd($)

    const title = firstNonEmpty(
        $('#productTitle').first().text(),
        $('#title span').first().text(),
        $('h1 span').first().text(),
        $('span[id*="ProductTitle"]').first().text(),
        $('meta[property="og:title"]').attr('content'),
        $('meta[name="title"]').attr('content'),
        jsonLd.title
    )

    const currentPriceText = firstNonEmpty(
        $('.a-price .a-offscreen').first().text(),
        $('#corePriceDisplay_desktop_feature_div .a-offscreen').first().text(),
        $('#corePrice_feature_div .a-offscreen').first().text(),
        $('span[data-a-color="price"] .a-offscreen').first().text(),
        $('meta[itemprop="price"]').attr('content'),
        jsonLd.priceText,
        extractPriceByRegex(html, ['priceAmount', 'priceToPay', 'currentPrice'])
    )

    const originalPriceText = firstNonEmpty(
        $('.basisPrice .a-offscreen').first().text(),
        $('.a-price.a-text-price .a-offscreen').first().text(),
        $('.a-text-strike').first().text(),
        jsonLd.originalPriceText,
        extractPriceByRegex(html, ['listPrice', 'priceBeforeDeal'])
    )

    const ratingText = firstNonEmpty(
        $('#acrPopover .a-icon-alt').first().text(),
        $('span.a-icon-alt').first().text(),
        jsonLd.ratingText
    )

    const reviewsText = firstNonEmpty(
        $('#acrCustomerReviewText').first().text(),
        jsonLd.reviewsText
    )

    const imageUrl = firstNonEmpty(
        $('#landingImage').attr('data-old-hires'),
        $('#landingImage').attr('src'),
        $('#imgBlkFront').attr('src'),
        $('meta[property="og:image"]').attr('content'),
        jsonLd.imageUrl
    )

    const bullets = []
    $('#feature-bullets ul li span.a-list-item').each((_, el) => {
        const text = toText($(el).text())
        if (text && !text.toLowerCase().includes('report an issue')) {
            bullets.push(text)
        }
    })

    if (bullets.length === 0 && Array.isArray(jsonLd.bullets) && jsonLd.bullets.length > 0) {
        bullets.push(...jsonLd.bullets)
    }

    if (!title || title.length < 5) {
        throw new Error('Could not extract a valid product title from Amazon page. The page format may have changed or requests are being limited.')
    }

    const parsedPrice = parseAmount(currentPriceText) ?? parseAmountLoose(currentPriceText)
    const parsedOriginalPrice = parseAmount(originalPriceText) ?? parseAmountLoose(originalPriceText)

    return {
        title,
        price: parsedPrice,
        originalPrice: parsedOriginalPrice,
        ratingText,
        reviewsText,
        affiliateUrl: rawUrl || inputUrl,
        resolvedUrl: finalUrl,
        asin: extractAsinFromUrl(finalUrl),
        imageUrls: imageUrl ? [imageUrl] : [],
        descriptionHtml: buildDescriptionHtml(bullets),
        bulletPoints: bullets,
    }
}
