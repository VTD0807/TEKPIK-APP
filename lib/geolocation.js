// Geo-location utility for detecting user's location
export const getGeoLocation = async () => {
    try {
        // Try browser's Geolocation API first (requires permission)
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'))
                return
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                    })
                },
                () => {
                    // Fallback: try IP-based geolocation
                    getIPBasedLocation().then(resolve).catch(reject)
                },
                { timeout: 5000, maximumAge: 3600000 }
            )
        })
    } catch {
        return getIPBasedLocation()
    }
}

// IP-based geolocation fallback
const getIPBasedLocation = async () => {
    try {
        const response = await fetch('https://ipapi.co/json/', { 
            cache: 'force-cache',
            next: { revalidate: 86400 } 
        })
        const data = await response.json()
        return {
            country: data.country_code,
            region: data.region,
            city: data.city,
            latitude: data.latitude,
            longitude: data.longitude,
            timezone: data.timezone,
            currency: data.currency,
        }
    } catch (error) {
        console.log('IP geolocation failed:', error.message)
        return null
    }
}

// Get user's timezone
export const getUserTimezone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
        return 'UTC'
    }
}

// Cache location in localStorage
export const cacheLocation = (location) => {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem('userLocation', JSON.stringify({
            ...location,
            timestamp: new Date().toISOString(),
        }))
    } catch {
        // Silent fail
    }
}

// Get cached location
export const getCachedLocation = () => {
    if (typeof window === 'undefined') return null
    try {
        const cached = localStorage.getItem('userLocation')
        if (!cached) return null

        const location = JSON.parse(cached)
        const cacheAge = new Date() - new Date(location.timestamp)
        // Cache valid for 24 hours
        if (cacheAge < 86400000) {
            return location
        }
        return null
    } catch {
        return null
    }
}

// Get location with caching
export const getLocationWithCache = async () => {
    const cached = getCachedLocation()
    if (cached) return cached

    const location = await getGeoLocation()
    if (location) {
        cacheLocation(location)
    }
    return location
}
