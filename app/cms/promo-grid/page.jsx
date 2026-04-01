'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

const DEFAULT_PROMO_GRID = {
    id: 'promo-grid-main',
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
}

const DEFAULT_CORE_SECTIONS = [
    { id: 'bannerCarousel', type: 'core', label: 'Banner Carousel', enabled: true },
    { id: 'bestPicks', type: 'core', label: 'Best Picks', enabled: true },
    { id: 'latestProducts', type: 'core', label: 'Latest Products', enabled: true },
    { id: 'hero', type: 'core', label: 'Hero Grid', enabled: true },
    { id: 'bestSelling', type: 'core', label: 'Best Selling', enabled: true },
    { id: 'specs', type: 'core', label: 'Store Highlights', enabled: true },
    { id: 'newsletter', type: 'core', label: 'Newsletter', enabled: true },
]

const CORE_SECTION_IDS = new Set(DEFAULT_CORE_SECTIONS.map(section => section.id))

const mergeWithCoreSections = (sections = []) => {
    const safeSections = Array.isArray(sections) ? sections : []
    const byId = new Map(safeSections.filter(Boolean).map(section => [section.id, section]))
    const mergedCore = DEFAULT_CORE_SECTIONS.map(defaultSection => ({
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

export default function CMSPromoGridPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploadingKey, setUploadingKey] = useState('')
    const [homepageSections, setHomepageSections] = useState([])
    const [form, setForm] = useState(DEFAULT_PROMO_GRID)

    useEffect(() => {
        fetch('/api/admin/settings', { cache: 'no-store' })
            .then(r => r.json())
            .then(data => {
                const sections = Array.isArray(data.homepageSections) ? data.homepageSections : []
                setHomepageSections(mergeWithCoreSections(sections))

                const fromSettings = data.promoGridSection
                const fromSections = sections.find(s => s.type === 'promoGrid')
                const source = fromSettings || fromSections || DEFAULT_PROMO_GRID

                const normalizedEnabled = source?.enabled === false || source?.enabled === 'false'
                    ? false
                    : (source?.enabled === true || source?.enabled === 'true' ? true : DEFAULT_PROMO_GRID.enabled)

                setForm({
                    ...DEFAULT_PROMO_GRID,
                    ...source,
                    enabled: normalizedEnabled,
                    id: source.id || 'promo-grid-main',
                    type: 'promoGrid',
                    label: 'Promo Grid',
                })
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

    const normalizeColor = (value) => {
        if (!value) return '#ffffff'
        if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) return value
        const m = value.match(/bg-\[#([0-9a-fA-F]{6})\]/)
        return m ? `#${m[1]}` : '#ffffff'
    }

    const handleColorChange = (key, hex) => {
        set(key, hex)
    }

    const uploadImage = async (file, key) => {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
        if (!cloudName || !uploadPreset) {
            throw new Error('Cloudinary is not configured')
        }

        const fd = new FormData()
        fd.append('file', file)
        fd.append('upload_preset', uploadPreset)

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: fd,
        })
        const data = await res.json()
        if (!res.ok || !data.secure_url) throw new Error(data.error?.message || 'Upload failed')
        set(key, data.secure_url)
    }

    const onImageInput = async (event, key) => {
        const file = event.target.files?.[0]
        if (!file) return
        setUploadingKey(key)
        const toastId = toast.loading('Uploading image...')
        try {
            await uploadImage(file, key)
            toast.success('Image uploaded', { id: toastId })
        } catch (err) {
            toast.error(err.message || 'Upload failed', { id: toastId })
        } finally {
            setUploadingKey('')
            event.target.value = ''
        }
    }

    const save = async () => {
        setSaving(true)
        const toastId = toast.loading('Saving promo grid...')
        try {
            const sectionPayload = {
                ...form,
                enabled: form.enabled === false || form.enabled === 'false' ? false : true,
                id: form.id || 'promo-grid-main',
                type: 'promoGrid',
                label: 'Promo Grid',
            }

            // Keep only one promo grid section so enabled/disabled state is never shadowed by stale duplicates.
            const baseSections = mergeWithCoreSections(homepageSections).filter(s => s.type !== 'promoGrid')
            const nextSections = [...baseSections, sectionPayload]

            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    promoGridSection: sectionPayload,
                    homepageSections: nextSections,
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to save')

            setHomepageSections(nextSections)
            toast.success('Promo grid saved', { id: toastId })
        } catch (err) {
            toast.error(err.message || 'Save failed', { id: toastId })
        } finally {
            setSaving(false)
        }
    }

    const inputClass = 'w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-black/10'

    if (loading) {
        return <div className="bg-white border border-slate-200 rounded-2xl p-6 h-40 animate-pulse" />
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Promo Grid Module</h1>
                <p className="text-sm text-slate-500 mt-1">Dedicated CMS module for the 3-card homepage promo grid.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">Module Status</p>
                    <button onClick={() => set('enabled', !form.enabled)} className={`px-3 py-1.5 text-xs rounded-full border ${form.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {form.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <p className="text-sm font-semibold text-slate-700">Left Big Card</p>
                <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="text-xs font-medium text-slate-500">Title</label><input className={inputClass} value={form.bigTitle} onChange={e => set('bigTitle', e.target.value)} /></div>
                    <div><label className="text-xs font-medium text-slate-500">CTA Text</label><input className={inputClass} value={form.bigCtaText} onChange={e => set('bigCtaText', e.target.value)} /></div>
                    <div><label className="text-xs font-medium text-slate-500">Link</label><input className={inputClass} value={form.bigLink} onChange={e => set('bigLink', e.target.value)} /></div>
                    <div>
                        <label className="text-xs font-medium text-slate-500">Image URL</label>
                        <input className={inputClass} value={form.bigImageUrl} onChange={e => set('bigImageUrl', e.target.value)} />
                        <label className="mt-2 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => onImageInput(e, 'bigImageUrl')} />
                            {uploadingKey === 'bigImageUrl' ? 'Uploading...' : 'Upload Image'}
                        </label>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-medium text-slate-500">Background Color / Class</label>
                        <div className="grid sm:grid-cols-[56px_1fr] gap-2">
                            <input type="color" value={normalizeColor(form.bigBgColor)} onChange={e => handleColorChange('bigBgColor', e.target.value)} className="mt-1 h-10 w-14 rounded border border-slate-200 bg-white" />
                            <input className={inputClass} value={form.bigBgColor} onChange={e => set('bigBgColor', e.target.value)} placeholder="#A9E6BD or bg-[#A9E6BD]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <p className="text-sm font-semibold text-slate-700">Top Right Card</p>
                <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="text-xs font-medium text-slate-500">Title</label><input className={inputClass} value={form.topTitle} onChange={e => set('topTitle', e.target.value)} /></div>
                    <div><label className="text-xs font-medium text-slate-500">CTA Text</label><input className={inputClass} value={form.topCtaText} onChange={e => set('topCtaText', e.target.value)} /></div>
                    <div><label className="text-xs font-medium text-slate-500">Link</label><input className={inputClass} value={form.topLink} onChange={e => set('topLink', e.target.value)} /></div>
                    <div>
                        <label className="text-xs font-medium text-slate-500">Image URL</label>
                        <input className={inputClass} value={form.topImageUrl} onChange={e => set('topImageUrl', e.target.value)} />
                        <label className="mt-2 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => onImageInput(e, 'topImageUrl')} />
                            {uploadingKey === 'topImageUrl' ? 'Uploading...' : 'Upload Image'}
                        </label>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-medium text-slate-500">Background Color / Class</label>
                        <div className="grid sm:grid-cols-[56px_1fr] gap-2">
                            <input type="color" value={normalizeColor(form.topBgColor)} onChange={e => handleColorChange('topBgColor', e.target.value)} className="mt-1 h-10 w-14 rounded border border-slate-200 bg-white" />
                            <input className={inputClass} value={form.topBgColor} onChange={e => set('topBgColor', e.target.value)} placeholder="#F1D4B8 or bg-[#F1D4B8]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <p className="text-sm font-semibold text-slate-700">Bottom Right Card</p>
                <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="text-xs font-medium text-slate-500">Title</label><input className={inputClass} value={form.bottomTitle} onChange={e => set('bottomTitle', e.target.value)} /></div>
                    <div><label className="text-xs font-medium text-slate-500">CTA Text</label><input className={inputClass} value={form.bottomCtaText} onChange={e => set('bottomCtaText', e.target.value)} /></div>
                    <div><label className="text-xs font-medium text-slate-500">Link</label><input className={inputClass} value={form.bottomLink} onChange={e => set('bottomLink', e.target.value)} /></div>
                    <div>
                        <label className="text-xs font-medium text-slate-500">Image URL</label>
                        <input className={inputClass} value={form.bottomImageUrl} onChange={e => set('bottomImageUrl', e.target.value)} />
                        <label className="mt-2 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => onImageInput(e, 'bottomImageUrl')} />
                            {uploadingKey === 'bottomImageUrl' ? 'Uploading...' : 'Upload Image'}
                        </label>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-medium text-slate-500">Background Color / Class</label>
                        <div className="grid sm:grid-cols-[56px_1fr] gap-2">
                            <input type="color" value={normalizeColor(form.bottomBgColor)} onChange={e => handleColorChange('bottomBgColor', e.target.value)} className="mt-1 h-10 w-14 rounded border border-slate-200 bg-white" />
                            <input className={inputClass} value={form.bottomBgColor} onChange={e => set('bottomBgColor', e.target.value)} placeholder="#B3D0F2 or bg-[#B3D0F2]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-xl shadow-lg shadow-black/10 disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save Promo Grid'}
                </button>
            </div>
        </div>
    )
}
