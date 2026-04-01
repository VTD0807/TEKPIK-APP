import BannerCarousel from "@/components/BannerCarousel";
import Hero from "@/components/Hero";
import OurSpecs from "@/components/OurSpec";
import Newsletter from "@/components/Newsletter";
import LatestProducts from "@/components/LatestProducts";
import BestSelling from "@/components/BestSelling";
import BestPicksForYou from "@/components/BestPicksForYou";
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
    { id: 'specs', type: 'core', label: 'Store Highlights', enabled: true },
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
    const effectivePromoGrid = settings.promoGridSection || promoGridFromList
    const heroSection = mergedSections.find(section => section?.id === 'hero')
    const isHeroEnabled = !(heroSection?.enabled === false || heroSection?.enabled === 'false')
    const sections = effectivePromoGrid
        ? [...mergedSections, effectivePromoGrid]
        : mergedSections

    const renderSection = (section) => {
        const isEnabled = !(section?.enabled === false || section?.enabled === 'false')
        if (!isEnabled) return null
        if (section.type === 'promoGrid') {
            // Keep Hero as the primary core module and prevent duplicate hero-like grids.
            if (isHeroEnabled) return null
            return (
                <PromoGridSection
                    key={section.id}
                    bigTitle={section.bigTitle}
                    bigCtaText={section.bigCtaText}
                    bigLink={section.bigLink}
                    bigImageUrl={section.bigImageUrl}
                    bigBgColor={section.bigBgColor}
                    topTitle={section.topTitle}
                    topCtaText={section.topCtaText}
                    topLink={section.topLink}
                    topImageUrl={section.topImageUrl}
                    topBgColor={section.topBgColor}
                    bottomTitle={section.bottomTitle}
                    bottomCtaText={section.bottomCtaText}
                    bottomLink={section.bottomLink}
                    bottomImageUrl={section.bottomImageUrl}
                    bottomBgColor={section.bottomBgColor}
                />
            )
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
                return <BestPicksForYou key={section.id} />
            case 'latestProducts':
                return <LatestProducts key={section.id} />
            case 'hero':
                return <Hero key={section.id} settings={settings} categories={categories} />
            case 'bestSelling':
                return <BestSelling key={section.id} />
            case 'specs':
                return <OurSpecs key={section.id} />
            case 'newsletter':
                return <Newsletter key={section.id} />
            default:
                return null
        }
    }

    return <div className="space-y-10">{sections.map(renderSection)}</div>
}
