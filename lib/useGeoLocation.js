'use client'

import { useEffect, useState, useCallback } from 'react'
import { getLocationWithCache } from '@/lib/geolocation'
import { getCurrencyByCountry, getLocaleByCountry } from '@/lib/currency'
import { getLanguageByCountry, getUserLanguage, saveLanguage, detectLanguageAndDirection } from '@/lib/locale'

export const useGeoLocation = () => {
    const [location, setLocation] = useState(null)
    const [currency, setCurrency] = useState(null)
    const [language, setLanguage] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchLocation = async () => {
            try {
                setLoading(true)
                const loc = await getLocationWithCache()

                if (loc) {
                    setLocation(loc)

                    // Set currency based on country
                    const curr = getCurrencyByCountry(loc.country)
                    setCurrency(curr)

                    // Set language based on country (but respect user's saved preference)
                    const userLang = getUserLanguage()
                    setLanguage(userLang)
                } else {
                    // Use defaults
                    setCurrency({ code: 'INR', symbol: '₹' })
                    setLanguage(getUserLanguage())
                }

                setError(null)
            } catch (err) {
                console.error('Error fetching location:', err)
                setError(err)
                // Set defaults on error
                setCurrency({ code: 'INR', symbol: '₹' })
                setLanguage(getUserLanguage())
            } finally {
                setLoading(false)
            }
        }

        fetchLocation()
    }, [])

    const changeCurrency = useCallback((currencyCode) => {
        // In production, this would update pricing across the app
        console.log('Currency changed to:', currencyCode)
    }, [])

    const changeLanguage = useCallback((languageCode) => {
        setLanguage(languageCode)
        saveLanguage(languageCode)
        // In production, this would reload translations
    }, [])

    return {
        location,
        currency,
        language,
        loading,
        error,
        changeCurrency,
        changeLanguage,
        locale: location?.country ? getLocaleByCountry(location.country) : 'en-IN',
        timezone: location?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
}

// Hook to get language and direction
export const useLanguageAndDirection = () => {
    const [config, setConfig] = useState(detectLanguageAndDirection())

    useEffect(() => {
        const config = detectLanguageAndDirection()
        setConfig(config)
        
        // Apply direction to document
        if (typeof document !== 'undefined') {
            document.documentElement.dir = config.direction
            document.documentElement.lang = config.language
        }
    }, [])

    return config
}

// Hook for formatting prices with proper locale
export const usePriceFormatter = () => {
    const { currency, locale } = useGeoLocation()

    return useCallback((price) => {
        if (!currency) return `$${price.toFixed(2)}`

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency.code,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(price)
    }, [currency, locale])
}
