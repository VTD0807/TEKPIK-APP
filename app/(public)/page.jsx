import BannerCarousel from "@/components/BannerCarousel";
import Newsletter from "@/components/Newsletter";
import LatestProducts from "@/components/LatestProducts";
import BestSelling from "@/components/BestSelling";
import PersonalizedTopFeed from "@/components/PersonalizedTopFeed";
import PromoSection from "@/components/PromoSection";
import { getProductionDb, timestampToJSON } from "@/lib/firebase-admin";
import { absoluteUrl } from '@/lib/seo'
import { getCachedSWR } from '@/lib/server-cache'
import { getCategoriesMap } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'
const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'TEKPIK'
const HOME_TAGLINE = 'Best Products at Best Prices in India'

export async function generateMetadata() {
    const title = `${STORE_NAME} - ${HOME_TAGLINE}`
    const description = `Discover AI-curated gadgets, accessories, and top deals in India with ${STORE_NAME}. Compare, shortlist, and buy smarter.`
    const canonical = absoluteUrl('/')
    const ogImage = absoluteUrl('/logo-tekpik.png')

    return {
        title,
        description,
        alternates: {
            canonical,
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-image-preview': 'large',
                'max-snippet': -1,
                'max-video-preview': -1,
            },
        },
        openGraph: {
            title,
            description,
            url: canonical,
            type: 'website',
            images: [{ url: ogImage }],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImage],
        },
    }
}

const DEFAULT_SECTIONS = [
    { id: 'bannerCarousel', type: 'core', label: 'Banner Carousel', enabled: true },
    { id: 'bestPicks', type: 'core', label: 'Best Picks', enabled: true },      
    { id: 'latestProducts', type: 'core', label: 'Latest Products', enabled: true },
    { id: 'bestSelling', type: 'core', label: 'Best Selling', enabled: true },  
    { id: 'newsletter', type: 'core', label: 'Newsletter', enabled: true },     
]

const CORE_SECTION_IDS = new Set(DEFAULT_SECTIONS.map(section => section.id))   

const mergeWithCoreSections = (sections = []) => {
    const safeSections = Array.isArray(sections) ? sections : []
    const byId = new Map(safeSections.filter(Boolean).map(section => [section.id, section]))
    const mergedCore = DEFAULT_SECTIONS.map(defaultSection => ({
        ...defaultSection,
        ...(byId.get(defaultSection.id) || {}),
        id: defaultSection.id,
        type: 'core',
    }))

    const extras = safeSections.filter(section => {
        if (!section || !section.id) return false
        if (CORE_SECTION_IDS.has(section.id)) return false
        return section.id !== 'specs' && section.type !== 'promoGrid' && section.type !== 'hero'
    })

    return [...mergedCore, ...extras]
}

export default async function Home() {
    let banners = []
    let settings = {}
    let categories = []

    const sanitizeValue = (value) => {
        if (!value) return value
        if (Array.isArray(value)) return value.map(sanitizeValue)
        if (typeof value === 'object') {
            if (typeof value.toDate === 'function') return timestampToJSON(value)
            const out = {}
            for (const [key, val] of Object.entries(value)) {
                out[key] = sanitizeValue(val)
            }
            return out
        }
        return value
    }

    try {
        // All 3 reads cached (5-min TTL + 3-min stale) and routed through getProductionDb failover
        const [bannersData, settingsData, categoriesMap] = await Promise.all([
            getCachedSWR('homepage:banners:v1', 5 * 60 * 1000, 3 * 60 * 1000, async () => {
                const db = await getProductionDb()
                if (!db) return []
                try {
                    // Fetch all banners, filter in-memory to avoid composite index requirement
                    const snap = await db.collection('banners').get()
                    const result = []
                    snap.forEach(doc => {
                        const data = doc.data()
                        if (data.isActive === true) {
                            result.push(sanitizeValue({ id: doc.id, ...data }))
                        }
                    })
                    // Sort by createdAt desc in-memory
                    result.sort((a, b) => {
                        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
                        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
                        return tb - ta
                    })
                    return result
                } catch {
                    return []
                }
            }),
            getCachedSWR('homepage:settings:v1', 5 * 60 * 1000, 3 * 60 * 1000, async () => {
                const db = await getProductionDb()
                if (!db) return {}
                try {
                    const settingsDoc = await db.collection('settings').doc('general').get()
                    return settingsDoc.exists ? sanitizeValue(settingsDoc.data()) : {}
                } catch {
                    return {}
                }
            }),
            getCategoriesMap(),
        ])

        banners = bannersData
        settings = settingsData
        // Extract category names from the centralized map
        categories = Object.values(categoriesMap)
            .map(cat => cat?.name || '')
            .filter(Boolean)
            .sort()
            .slice(0, 10)

    } catch (error) {
        console.error('Error fetching data for homepage:', error?.message || error)
    }

    const rawSections = Array.isArray(settings.homepageSections) && settings.homepageSections.length > 0
        ? settings.homepageSections
        : DEFAULT_SECTIONS

    const mergedSections = mergeWithCoreSections(rawSections)
    const sections = mergedSections

    const renderSection = (section) => {
        const isEnabled = !(section?.enabled === false || section?.enabled === 'false')
        if (!isEnabled) return null
        if (section.type === 'promo') {
            return (
                <PromoSection
                    key={section.id}
                    title={section.title}
                    subtitle={section.subtitle}
                    ctaText={section.ctaText}
                    link={section.link}
                    imageUrl={section.imageUrl}
                    bgColor={section.bgColor}
                />
            )
        }
        switch (section.id) {
            case 'bannerCarousel':
                return <BannerCarousel key={section.id} banners={banners} settings={settings} />
            case 'bestPicks':
                return <PersonalizedTopFeed key={section.id} />
            case 'latestProducts':
                return <LatestProducts key={section.id} />
            case 'bestSelling':
                return <BestSelling key={section.id} />
            case 'newsletter':
                return <Newsletter key={section.id} />
            default:
                return null
        }
    }

    return <div className="space-y-10">{sections.map(renderSection)}</div>
}
