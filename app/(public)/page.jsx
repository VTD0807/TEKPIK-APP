import BannerCarousel from "@/components/BannerCarousel";
import Hero from "@/components/Hero";
import Newsletter from "@/components/Newsletter";
import LatestProducts from "@/components/LatestProducts";
import BestSelling from "@/components/BestSelling";
import PersonalizedTopFeed from "@/components/PersonalizedTopFeed";
import PromoSection from "@/components/PromoSection";
import PromoGridSection from "@/components/PromoGridSection";
import { dbAdmin, timestampToJSON } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic'

const DEFAULT_SECTIONS = [
    { id: 'bannerCarousel', type: 'core', label: 'Banner Carousel', enabled: true },
    { id: 'bestPicks', type: 'core', label: 'Best Picks', enabled: true },
    { id: 'latestProducts', type: 'core', label: 'Latest Products', enabled: true },
    { id: 'hero', type: 'core', label: 'Hero Grid', enabled: true },
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
        if (section.id === 'specs') return false
        return section.type !== 'promoGrid'
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
    
    if (dbAdmin) {
        try {
            // Fetch Promotional Banners for Carousel
            const snap = await dbAdmin.collection('banners').where('isActive', '==', true).orderBy('createdAt', 'desc').get()
            snap.forEach(doc => {
                const data = doc.data()
                banners.push(sanitizeValue({ id: doc.id, ...data }))
            })

            // Fetch Homepage Settings
            const settingsDoc = await dbAdmin.collection('settings').doc('general').get()
            if (settingsDoc.exists) {
                settings = sanitizeValue(settingsDoc.data())
            }

            // Fetch Active Categories
            const catSnap = await dbAdmin.collection('categories').orderBy('name').limit(10).get()
            catSnap.forEach(doc => {
                categories.push(doc.data().name)
            })

        } catch (error) {
            console.error('Error fetching data for homepage:', error)
        }
    }

    const rawSections = Array.isArray(settings.homepageSections) && settings.homepageSections.length > 0
        ? settings.homepageSections
        : DEFAULT_SECTIONS

    // Promo Grid can be edited from a dedicated CMS module; treat that object as source of truth.
    const mergedSections = mergeWithCoreSections(rawSections)
    const promoGridFromList = Array.isArray(rawSections)
        ? rawSections.find(section => section?.type === 'promoGrid')
        : null
    const rawPromoGrid = settings.promoGridSection || promoGridFromList
    const isPromoGridEnabled = !(rawPromoGrid?.enabled === false || rawPromoGrid?.enabled === 'false')
    const effectivePromoGrid = isPromoGridEnabled ? rawPromoGrid : null
    const heroSection = mergedSections.find(section => section?.id === 'hero')
    const isHeroEnabled = !(heroSection?.enabled === false || heroSection?.enabled === 'false')
    const sections = effectivePromoGrid
        ? [...mergedSections, effectivePromoGrid]
        : mergedSections

    const heroBannersFromPromoGrid = effectivePromoGrid
        ? [
            {
                imageUrl: effectivePromoGrid.bigImageUrl,
                link: effectivePromoGrid.bigLink,
                title: effectivePromoGrid.bigTitle,
            },
            {
                imageUrl: effectivePromoGrid.topImageUrl,
                link: effectivePromoGrid.topLink,
                title: effectivePromoGrid.topTitle,
            },
            {
                imageUrl: effectivePromoGrid.bottomImageUrl,
                link: effectivePromoGrid.bottomLink,
                title: effectivePromoGrid.bottomTitle,
            },
        ]
        : null
    const heroSettings = heroBannersFromPromoGrid
        ? { ...settings, heroBanners: heroBannersFromPromoGrid }
        : settings

    const renderSection = (section) => {
        const isEnabled = !(section?.enabled === false || section?.enabled === 'false')
        if (!isEnabled) return null
        if (section.type === 'promoGrid') {
            // Use promo grid data to drive the Hero layout instead of rendering a duplicate section.
            return null
        }
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
            case 'hero':
                return <Hero key={section.id} settings={heroSettings} categories={categories} />
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
