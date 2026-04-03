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

const parseAmount = (value = '') => {
    const cleaned = String(value || '')
        .replace(/[^\d.,]/g, '')
        .replace(/,/g, '')
        .trim()

    if (!cleaned) return null
    const parsed = Number.parseFloat(cleaned)
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

    const title = toText($('#productTitle').first().text())
    const currentPriceText =
        toText($('.a-price .a-offscreen').first().text()) ||
        toText($('.a-price-whole').first().text())

    const originalPriceText =
        toText($('.basisPrice .a-offscreen').first().text()) ||
        toText($('.a-price.a-text-price .a-offscreen').first().text()) ||
        toText($('.a-text-strike').first().text())

    const ratingText =
        toText($('#acrPopover .a-icon-alt').first().text()) ||
        toText($('span.a-icon-alt').first().text())

    const reviewsText = toText($('#acrCustomerReviewText').first().text())

    const imageUrl =
        $('#landingImage').attr('data-old-hires') ||
        $('#landingImage').attr('src') ||
        $('#imgBlkFront').attr('src') ||
        ''

    const bullets = []
    $('#feature-bullets ul li span.a-list-item').each((_, el) => {
        const text = toText($(el).text())
        if (text && !text.toLowerCase().includes('report an issue')) {
            bullets.push(text)
        }
    })

    if (!title) {
        throw new Error('Could not extract product details. Amazon may be blocking this request for now.')
    }

    return {
        title,
        price: parseAmount(currentPriceText),
        originalPrice: parseAmount(originalPriceText),
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
