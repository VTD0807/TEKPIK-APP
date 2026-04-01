'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowUp, ArrowDown, Plus, Trash, ToggleOn, ToggleOff } from 'react-bootstrap-icons'

const DEFAULT_SECTIONS = [
    { id: 'bannerCarousel', type: 'core', label: 'Banner Carousel', enabled: true },
    { id: 'bestPicks', type: 'core', label: 'Best Picks', enabled: true },
    { id: 'latestProducts', type: 'core', label: 'Latest Products', enabled: true },
    { id: 'hero', type: 'core', label: 'Hero Grid', enabled: true },
    { id: 'bestSelling', type: 'core', label: 'Best Selling', enabled: true },
    { id: 'specs', type: 'core', label: 'Store Highlights', enabled: true },
    { id: 'newsletter', type: 'core', label: 'Newsletter', enabled: true },
]

const createPromo = () => ({
    id: `promo-${Date.now()}`,
    type: 'promo',
    label: 'Promo Section',
    enabled: true,
    title: 'New Promo Section',
    subtitle: 'Add a short pitch for this promo section.',
    ctaText: 'Shop now',
    link: '/shop',
    imageUrl: '',
    bgColor: 'bg-white'
})

const createPromoGrid = () => ({
    id: `promo-grid-${Date.now()}`,
    type: 'promoGrid',
    label: 'Promo Grid',
    enabled: true,
    bigTitle: "Gadgets you'll love.",
    bigCtaText: 'Learn more',
    bigLink: '/shop',
    bigImageUrl: '',
    bigBgColor: 'bg-[#A9E6BD]',
    topTitle: 'Best products',
    topCtaText: 'View more',
    topLink: '/shop',
    topImageUrl: '',
    topBgColor: 'bg-[#F1D4B8]',
    bottomTitle: '20% discounts',
    bottomCtaText: 'View more',
    bottomLink: '/shop',
    bottomImageUrl: '',
    bottomBgColor: 'bg-[#B3D0F2]',
})

export default function StorefrontSettings() {
    const [sections, setSections] = useState(DEFAULT_SECTIONS)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetch('/api/admin/settings')
            .then(r => r.json())
            .then(data => {
                const incoming = Array.isArray(data.homepageSections) ? data.homepageSections : null
                setSections(incoming && incoming.length > 0 ? incoming : DEFAULT_SECTIONS)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    const move = (index, dir) => {
        const next = [...sections]
        const target = index + dir
        if (target < 0 || target >= next.length) return
        const temp = next[index]
        next[index] = next[target]
        next[target] = temp
        setSections(next)
    }

    const updateSection = (id, updates) => {
        setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    }

    const removeSection = (id) => {
        setSections(prev => prev.filter(s => s.id !== id))
    }

    const addPromo = () => {
        setSections(prev => [...prev, createPromo()])
    }

    const addPromoGrid = () => {
        setSections(prev => [...prev, createPromoGrid()])
    }

    const handleSave = async () => {
        setSaving(true)
        const toastId = toast.loading('Saving storefront settings...')
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ homepageSections: sections }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to save')
            toast.success('Storefront updated', { id: toastId })
        } catch (err) {
            toast.error(err.message || 'Save failed', { id: toastId })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Storefront Sections</h1>
                <p className="text-sm text-slate-500 mt-1">Enable, reorder, or create homepage sections.</p>
            </div>

            {loading ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse h-40" />
            ) : (
                <div className="space-y-4">
                    {sections.map((section, index) => (
                        <div key={section.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => move(index, -1)} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition" title="Move up">
                                        <ArrowUp size={14} />
                                    </button>
                                    <button onClick={() => move(index, 1)} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition" title="Move down">
                                        <ArrowDown size={14} />
                                    </button>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{section.label || section.title || 'Section'}</p>
                                        <p className="text-[11px] text-slate-400">{section.type === 'promo' ? 'Custom promo section' : 'Core section'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateSection(section.id, { enabled: !section.enabled })}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${section.enabled ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                                    >
                                        {section.enabled ? <ToggleOn size={12} /> : <ToggleOff size={12} />}
                                        {section.enabled ? 'Enabled' : 'Disabled'}
                                    </button>
                                    {section.type === 'promo' && (
                                        <button onClick={() => removeSection(section.id)} className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition" title="Remove section">
                                            <Trash size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {section.type === 'promo' && (
                                <div className="mt-4 grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Title</label>
                                        <input
                                            value={section.title || ''}
                                            onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">CTA Text</label>
                                        <input
                                            value={section.ctaText || ''}
                                            onChange={(e) => updateSection(section.id, { ctaText: e.target.value })}
                                            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-medium text-slate-500">Subtitle</label>
                                        <input
                                            value={section.subtitle || ''}
                                            onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                                            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Link</label>
                                        <input
                                            value={section.link || ''}
                                            onChange={(e) => updateSection(section.id, { link: e.target.value })}
                                            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Image URL</label>
                                        <input
                                            value={section.imageUrl || ''}
                                            onChange={(e) => updateSection(section.id, { imageUrl: e.target.value })}
                                            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-medium text-slate-500">Background Gradient (Tailwind)</label>
                                        <input
                                            value={section.bgColor || ''}
                                            onChange={(e) => updateSection(section.id, { bgColor: e.target.value })}
                                            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10"
                                            placeholder="bg-white"
                                        />
                                        <p className="text-[11px] text-slate-400 mt-1">Example: bg-slate-100</p>
                                    </div>
                                </div>
                            )}

                            {section.type === 'promoGrid' && (
                                <div className="mt-4 grid md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Large Left Card</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Title</label>
                                        <input value={section.bigTitle || ''} onChange={(e) => updateSection(section.id, { bigTitle: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">CTA Text</label>
                                        <input value={section.bigCtaText || ''} onChange={(e) => updateSection(section.id, { bigCtaText: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Link</label>
                                        <input value={section.bigLink || ''} onChange={(e) => updateSection(section.id, { bigLink: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Image URL</label>
                                        <input value={section.bigImageUrl || ''} onChange={(e) => updateSection(section.id, { bigImageUrl: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-medium text-slate-500">Background Class</label>
                                        <input value={section.bigBgColor || ''} onChange={(e) => updateSection(section.id, { bigBgColor: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10" />
                                    </div>

                                    <div className="md:col-span-2 mt-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Right Card</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Title</label>
                                        <input value={section.topTitle || ''} onChange={(e) => updateSection(section.id, { topTitle: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">CTA Text</label>
                                        <input value={section.topCtaText || ''} onChange={(e) => updateSection(section.id, { topCtaText: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Link</label>
                                        <input value={section.topLink || ''} onChange={(e) => updateSection(section.id, { topLink: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Image URL</label>
                                        <input value={section.topImageUrl || ''} onChange={(e) => updateSection(section.id, { topImageUrl: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-medium text-slate-500">Background Class</label>
                                        <input value={section.topBgColor || ''} onChange={(e) => updateSection(section.id, { topBgColor: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10" />
                                    </div>

                                    <div className="md:col-span-2 mt-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bottom Right Card</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Title</label>
                                        <input value={section.bottomTitle || ''} onChange={(e) => updateSection(section.id, { bottomTitle: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">CTA Text</label>
                                        <input value={section.bottomCtaText || ''} onChange={(e) => updateSection(section.id, { bottomCtaText: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Link</label>
                                        <input value={section.bottomLink || ''} onChange={(e) => updateSection(section.id, { bottomLink: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Image URL</label>
                                        <input value={section.bottomImageUrl || ''} onChange={(e) => updateSection(section.id, { bottomImageUrl: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-medium text-slate-500">Background Class</label>
                                        <input value={section.bottomBgColor || ''} onChange={(e) => updateSection(section.id, { bottomBgColor: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <button
                    onClick={addPromo}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl shadow-lg hover:bg-slate-800 transition"
                >
                    <Plus size={14} />
                    Add Promo Section
                </button>
                <button
                    onClick={addPromoGrid}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl shadow-lg hover:bg-slate-800 transition"
                >
                    <Plus size={14} />
                    Add Promo Grid
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-xl shadow-lg shadow-black/10 hover:scale-105 transition-transform disabled:opacity-60"
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    )
}


