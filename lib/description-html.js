const ALLOWED_TAGS = new Set([
    'p',
    'br',
    'ul',
    'ol',
    'li',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'span',
])

export const sanitizeDescriptionHtml = (value) => {
    if (!value) return ''

    let html = String(value)

    // Remove high-risk container tags entirely (including content for script/style).
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    html = html.replace(/<style[\s\S]*?<\/style>/gi, '')
    html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    html = html.replace(/<object[\s\S]*?<\/object>/gi, '')
    html = html.replace(/<embed[\s\S]*?>/gi, '')
    html = html.replace(/<link[\s\S]*?>/gi, '')
    html = html.replace(/<meta[\s\S]*?>/gi, '')

    // Drop inline JS handlers and style attributes.
    html = html.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    html = html.replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')

    // Keep only allowed tags and strip all attributes from allowed tags.
    html = html.replace(/<\/?([a-z0-9-]+)(?:\s[^>]*)?>/gi, (full, tagName) => {
        const tag = String(tagName || '').toLowerCase()
        if (!ALLOWED_TAGS.has(tag)) return ''

        const isClosing = full.startsWith('</')
        if (isClosing) return `</${tag}>`
        if (tag === 'br') return '<br>'

        return `<${tag}>`
    })

    return html.trim()
}

export const descriptionToPlainText = (value) => {
    if (!value) return ''
    return String(value)
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}
