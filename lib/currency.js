// Currency configuration by country/region
export const CURRENCY_BY_COUNTRY = {
    IN: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    US: { code: 'USD', symbol: '$', name: 'US Dollar' },
    GB: { code: 'GBP', symbol: '£', name: 'British Pound' },
    CA: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    AU: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    DE: { code: 'EUR', symbol: '€', name: 'Euro' },
    FR: { code: 'EUR', symbol: '€', name: 'Euro' },
    JP: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    SG: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    AE: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    BR: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    MX: { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
}

// Default currency
export const DEFAULT_CURRENCY = CURRENCY_BY_COUNTRY.IN

// Get currency by country code
export const getCurrencyByCountry = (countryCode) => {
    if (!countryCode) return DEFAULT_CURRENCY
    return CURRENCY_BY_COUNTRY[countryCode.toUpperCase()] || DEFAULT_CURRENCY
}

// Format price with currency
export const formatPrice = (amount, currencyCode = 'INR', locale = 'en-IN') => {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount)
    } catch {
        // Fallback to simple formatting
        const currency = Object.values(CURRENCY_BY_COUNTRY).find(c => c.code === currencyCode)
        return `${currency?.symbol || '$'}${amount.toFixed(2)}`
    }
}

// Format price range
export const formatPriceRange = (minPrice, maxPrice, currencyCode = 'INR', locale = 'en-IN') => {
    const min = formatPrice(minPrice, currencyCode, locale)
    const max = formatPrice(maxPrice, currencyCode, locale)
    return `${min} - ${max}`
}

// Convert price between currencies (simplified - in production use real exchange rates)
export const convertCurrency = (amount, fromCode, toCode, exchangeRates = {}) => {
    if (fromCode === toCode) return amount

    const rate = exchangeRates[`${fromCode}_${toCode}`]
    if (!rate) {
        console.warn(`Exchange rate not found for ${fromCode}_${toCode}`)
        return amount
    }

    return amount * rate
}

// Get locale string by country code
export const getLocaleByCountry = (countryCode) => {
    const localeMap = {
        IN: 'en-IN',
        US: 'en-US',
        GB: 'en-GB',
        CA: 'en-CA',
        AU: 'en-AU',
        DE: 'de-DE',
        FR: 'fr-FR',
        JP: 'ja-JP',
        SG: 'en-SG',
        AE: 'ar-AE',
        BR: 'pt-BR',
        MX: 'es-MX',
    }
    return localeMap[countryCode?.toUpperCase()] || 'en-US'
}

// Format number with locale
export const formatNumber = (num, locale = 'en-IN') => {
    return new Intl.NumberFormat(locale).format(num)
}

// Format date with locale
export const formatDate = (date, locale = 'en-IN', options = {}) => {
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options,
    }).format(new Date(date))
}

// Get relative time (e.g., "2 days ago")
export const getRelativeTime = (date, locale = 'en-IN') => {
    const now = new Date()
    const then = new Date(date)
    const seconds = Math.floor((now - then) / 1000)

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
    }

    for (const [key, value] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / value)
        if (interval >= 1) {
            const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
            return rtf.format(-interval, key)
        }
    }

    return 'just now'
}
