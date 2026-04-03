// Language configuration
export const SUPPORTED_LANGUAGES = {
    en: {
        code: 'en',
        name: 'English',
        nativeLanguage: 'English',
        direction: 'ltr',
        countries: ['US', 'GB', 'AU', 'CA', 'IN', 'SG'],
    },
    hi: {
        code: 'hi',
        name: 'Hindi',
        nativeLanguage: 'हिंदी',
        direction: 'ltr',
        countries: ['IN'],
    },
    es: {
        code: 'es',
        name: 'Spanish',
        nativeLanguage: 'Español',
        direction: 'ltr',
        countries: ['MX', 'BR', 'ES'],
    },
    pt: {
        code: 'pt',
        name: 'Portuguese',
        nativeLanguage: 'Português',
        direction: 'ltr',
        countries: ['BR', 'PT'],
    },
    de: {
        code: 'de',
        name: 'German',
        nativeLanguage: 'Deutsch',
        direction: 'ltr',
        countries: ['DE', 'AT', 'CH'],
    },
    fr: {
        code: 'fr',
        name: 'French',
        nativeLanguage: 'Français',
        direction: 'ltr',
        countries: ['FR', 'CA'],
    },
    ja: {
        code: 'ja',
        name: 'Japanese',
        nativeLanguage: '日本語',
        direction: 'ltr',
        countries: ['JP'],
    },
    ar: {
        code: 'ar',
        name: 'Arabic',
        nativeLanguage: 'العربية',
        direction: 'rtl',
        countries: ['AE', 'SA'],
    },
}

// Get language by country code
export const getLanguageByCountry = (countryCode) => {
    if (!countryCode) return SUPPORTED_LANGUAGES.en

    // Find language that supports this country
    const language = Object.values(SUPPORTED_LANGUAGES).find(lang =>
        lang.countries.includes(countryCode.toUpperCase())
    )

    return language || SUPPORTED_LANGUAGES.en
}

// Get browser language preference
export const getBrowserLanguage = () => {
    if (typeof navigator === 'undefined') return 'en'

    const browserLang = navigator.language?.split('-')[0].toLowerCase()
    return SUPPORTED_LANGUAGES[browserLang] ? browserLang : 'en'
}

// Get user language preference from localStorage
export const getSavedLanguage = () => {
    if (typeof window === 'undefined') return null

    try {
        return localStorage.getItem('userLanguage')
    } catch {
        return null
    }
}

// Save language preference
export const saveLanguage = (languageCode) => {
    if (typeof window === 'undefined') return

    try {
        localStorage.setItem('userLanguage', languageCode)
    } catch {
        // Silent fail
    }
}

// Get user's preferred language
export const getUserLanguage = () => {
    return getSavedLanguage() || getBrowserLanguage()
}

// Detect language and direction
export const detectLanguageAndDirection = () => {
    const language = getUserLanguage()
    const config = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.en

    return {
        language: config.code,
        direction: config.direction,
        locale: `${config.code}-${config.countries[0] || 'US'}`,
    }
}

// Strings for localization (example - in production use a i18n library like next-intl)
export const STRINGS = {
    en: {
        home: 'Home',
        shop: 'Shop',
        aiPicks: 'AI Picks',
        help: 'Help',
        about: 'About',
        signIn: 'Sign In',
        profile: 'Profile',
        signOut: 'Sign Out',
        search: 'Search products',
        notFound: 'Not Found',
        pageNotFound: 'Page Not Found',
        searchProducts: 'Search products',
        browseShop: 'Browse Shop',
        viewOnAmazon: 'View on Amazon',
        addToWishlist: 'Add to Wishlist',
        removeFromWishlist: 'Remove from Wishlist',
        loading: 'Loading...',
        error: 'Error',
        tryAgain: 'Try Again',
        goHome: 'Go Home',
        privacyPolicy: 'Privacy Policy',
        termsOfService: 'Terms of Service',
        affiliateDisclosure: 'Affiliate Disclosure',
        contactUs: 'Contact Us',
        currency: '₹',
    },
    hi: {
        home: 'होम',
        shop: 'दुकान',
        aiPicks: 'एआई चुनता है',
        help: 'मदद',
        about: 'के बारे में',
        signIn: 'साइन इन करें',
        profile: 'प्रोफ़ाइल',
        signOut: 'साइन आउट करें',
        search: 'उत्पाद खोजें',
        notFound: 'नहीं मिला',
        pageNotFound: 'पृष्ठ नहीं मिला',
        searchProducts: 'उत्पाद खोजें',
        browseShop: 'दुकान ब्राउज़ करें',
        viewOnAmazon: 'Amazon पर देखें',
        addToWishlist: 'विशलिस्ट में जोड़ें',
        removeFromWishlist: 'विशलिस्ट से हटाएं',
        loading: 'लोड हो रहा है...',
        error: 'त्रुटि',
        tryAgain: 'पुनः प्रयास करें',
        goHome: 'होम जाएं',
        privacyPolicy: 'गोपनीयता नीति',
        termsOfService: 'सेवा की शर्तें',
        affiliateDisclosure: 'संबद्ध प्रकटीकरण',
        contactUs: 'हमसे संपर्क करें',
        currency: '₹',
    },
}

// Get string by key and language
export const getString = (key, language = 'en') => {
    return STRINGS[language]?.[key] || STRINGS.en[key] || key
}
