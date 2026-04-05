'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
    ArrowRepeat,
    BoxSeam,
    CardText,
    CheckCircleFill,
    ClockHistory,
    Gear,
    LightningChargeFill,
    Robot,
    SendFill,
    Sliders,
} from 'react-bootstrap-icons'

function toToken(name) {
    return `${String.fromCharCode(123, 123)}${name}${String.fromCharCode(125, 125)}`
}

const DEFAULT_CONFIG = {
    enabled: false,
    botToken: '',
    chatId: '',
    frequencyMinutes: 180,
    maxPerRun: 25,
    delayMs: 350,
    publishNewProducts: true,
    priceTrackerEnabled: true,
    minimumPriceDropPercent: 0,
    templates: {
        catalog: `<b>${toToken('title')}</b>\nPrice: ${toToken('price')}\n\nView: ${toToken('productUrl')}\nAffiliate: ${toToken('affiliateUrl')}`,
        priceDrop: `<b>Price Drop Alert</b>\n<b>${toToken('title')}</b>\nOld: ${toToken('oldPrice')}\nNew: ${toToken('newPrice')}\nDrop: ${toToken('dropPercent')}%\n\nView: ${toToken('productUrl')}`,
        test: `<b>TEKPIK Telegram Test</b>\nTelegram integration is connected and ready.\n\nOpen: ${toToken('adminUrl')}`,
        customTemplates: [],
    },
}

const DEFAULT_STATUS = {
    enabled: false,
    botTokenConfigured: false,
    chatIdConfigured: false,
    priceTrackerEnabled: false,
    publishNewProducts: false,
    ready: false,
}

const DEFAULT_STATS = {
    activeProducts: 0,
    publishedProducts: 0,
    pendingCatalogPosts: 0,
    lastMessages: [],
    recentRuns: [],
}

const TABS = [
    { id: 'add-product', label: 'Add Product', icon: BoxSeam },
    { id: 'templates', label: 'Message Templates', icon: CardText },
    { id: 'manual-send', label: 'Manual Send', icon: SendFill },
    { id: 'automation', label: 'Automation Settings', icon: Sliders },
    { id: 'message-history', label: 'Message History', icon: ClockHistory },
    { id: 'bot', label: 'Bot Settings', icon: Robot },
]

const TEMPLATE_SHORTCUTS = [
    'title',
    'price',
    'productUrl',
    'affiliateUrl',
    'oldPrice',
    'newPrice',
    'dropPercent',
    'adminUrl',
]

const EMOJI_SEEDS = ['🔥', '💸', '🚨', '✅', '⭐', '🛒', '🎯', '📣']

const TEMPLATE_SEEDS = [
    {
        key: 'flash_deal',
        label: 'Flash Deal',
        body: `🔥 <b>Flash Deal</b>\n${toToken('title')}\n💰 ${toToken('price')}\n\n🛒 ${toToken('affiliateUrl')}`,
    },
    {
        key: 'price_crash',
        label: 'Price Crash Alert',
        body: `🚨 <b>Price Crash</b>\n${toToken('title')}\nWas: ${toToken('oldPrice')}\nNow: ${toToken('newPrice')}\nDrop: ${toToken('dropPercent')}%\n\n🔗 ${toToken('productUrl')}`,
    },
    {
        key: 'top_pick',
        label: 'Top Pick',
        body: `⭐ <b>Top Pick Today</b>\n${toToken('title')}\nBrand: ${toToken('brand')}\nPrice: ${toToken('price')}\n\nBuy: ${toToken('affiliateUrl')}`,
    },
]

const formatDateTime = (value) => {
    if (!value) return '—'
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

const formatPriceDisplay = (value) => {
    const num = Number(value)
    if (!Number.isFinite(num)) return '—'
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(num)
}

const buildManualVariablesFromProduct = (product) => {
    if (!product) return {}

    const productUrl = String(product.affiliateUrl || '')
    const currentPrice = formatPriceDisplay(product.price)
    const originalPrice = formatPriceDisplay(product.originalPrice)
    const currentPriceNum = Number(product.price)
    const originalPriceNum = Number(product.originalPrice)
    const dropPercent = Number.isFinite(currentPriceNum)
        && Number.isFinite(originalPriceNum)
        && originalPriceNum > 0
        && currentPriceNum < originalPriceNum
        ? Math.round((1 - (currentPriceNum / originalPriceNum)) * 100)
        : ''
    return {
        title: product.title || '',
        brand: product.brand || '',
        price: currentPrice,
        oldPrice: originalPrice === '—' ? '' : originalPrice,
        newPrice: currentPrice,
        dropPercent,
        productUrl,
        affiliateUrl: productUrl,
    }
}

const shortenText = (value = '', max = 90) => {
    const source = String(value || '').trim()
    if (!source) return ''
    if (source.length <= max) return source
    return `${source.slice(0, max - 1)}...`
}

function SectionTitle({ eyebrow, title, description }) {
    return (
        <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
    )
}

function StatCard({ label, value, helper, icon: Icon }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
                </div>
                {Icon ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <Icon size={18} />
                    </div>
                ) : null}
            </div>
            {helper ? <p className="mt-2 text-xs text-slate-400">{helper}</p> : null}
        </div>
    )
}

function HealthRow({ label, value, ok }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <span className="text-slate-600">{label}</span>
            <span className={`text-sm font-medium ${ok ? 'text-emerald-600' : 'text-amber-600'}`}>{value}</span>
        </div>
    )
}

export default function TelegramManagerPanel() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [runningAction, setRunningAction] = useState('')
    const [activeTab, setActiveTab] = useState('add-product')

    const [config, setConfig] = useState(DEFAULT_CONFIG)
    const [status, setStatus] = useState(DEFAULT_STATUS)
    const [stats, setStats] = useState(DEFAULT_STATS)
    const [categories, setCategories] = useState([])
    const [importedProducts, setImportedProducts] = useState([])
    const [manualProducts, setManualProducts] = useState([])
    const [manualProductSearch, setManualProductSearch] = useState('')

    const [importForm, setImportForm] = useState({
        url: '',
        title: '',
        brand: '',
        categoryId: '',
        tags: '',
        isFeatured: false,
        isActive: true,
    })
    const [newTemplate, setNewTemplate] = useState({ key: '', label: '', body: '' })
    const [manualSend, setManualSend] = useState({
        templateKey: '',
        productId: '',
        includeImage: true,
        message: '',
        variablesJson: '{\n  "title": "",\n  "price": "",\n  "productUrl": "",\n  "affiliateUrl": "",\n  "oldPrice": "",\n  "newPrice": "",\n  "dropPercent": ""\n}',
    })

    const withTimeout = async (promise, timeoutMs = 8000) => {
        let timeoutId
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
        })

        try {
            return await Promise.race([promise, timeoutPromise])
        } finally {
            clearTimeout(timeoutId)
        }
    }

    const loadData = async () => {
        const [managerRes, categoriesRes] = await Promise.all([
            withTimeout(fetch('/api/admin/telegram-manager', { cache: 'no-store' }), 8000),
            withTimeout(fetch('/api/admin/categories', { cache: 'no-store' }), 8000),
        ])

        const managerData = await managerRes.json().catch(() => ({}))
        const categoriesData = await categoriesRes.json().catch(() => ([]))

        if (!managerRes.ok) throw new Error(managerData?.error || 'Failed to load Telegram manager')

        setConfig({ ...DEFAULT_CONFIG, ...(managerData.config || {}) })
        setStatus(managerData.status || DEFAULT_STATUS)
        setStats(managerData.stats || DEFAULT_STATS)
        setImportedProducts(Array.isArray(managerData.importedProducts) ? managerData.importedProducts : [])
        setManualProducts(Array.isArray(managerData.manualProducts) ? managerData.manualProducts : [])
        setCategories(Array.isArray(categoriesData) ? categoriesData : [])
    }

    useEffect(() => {
        let cancelled = false

        const run = async () => {
            try {
                await loadData()
            } catch (error) {
                if (!cancelled) {
                    toast.error(error.message || 'Failed to load Telegram manager')
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        run()
        return () => {
            cancelled = true
        }
    }, [])

    const updateField = (key, value) => {
        setConfig((prev) => ({ ...prev, [key]: value }))
    }

    const updateTemplate = (key, value) => {
        setConfig((prev) => ({
            ...prev,
            templates: {
                ...(prev.templates || {}),
                [key]: value,
            },
        }))
    }

    const saveConfig = async (label = 'Telegram settings saved') => {
        setSaving(true)
        try {
            const res = await fetch('/api/admin/telegram-manager', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data?.error || 'Failed to save settings')
            setConfig({ ...DEFAULT_CONFIG, ...(data.config || {}) })
            setStatus(data.status || DEFAULT_STATUS)
            await loadData()
            toast.success(label)
        } catch (error) {
            toast.error(error.message || 'Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    const runAction = async (action, payload = {}, loadingText = 'Running action...') => {
        setRunningAction(action)
        const toastId = toast.loading(loadingText)

        try {
            const res = await fetch('/api/admin/telegram-manager', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...payload }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data?.error || 'Action failed')

            if (action === 'test') toast.success('Test message sent', { id: toastId })
            if (action === 'publishCatalog') toast.success(`Published ${data?.publishedCount || 0} products`, { id: toastId })
            if (action === 'priceTrack') toast.success(`Checked ${data?.summary?.checked || 0} products`, { id: toastId })
            if (action === 'importProduct') toast.success(`Product ${data?.mode || 'created'} successfully`, { id: toastId })
            if (action === 'manualSend') toast.success('Message sent to Telegram', { id: toastId })

            await loadData()
            return data
        } catch (error) {
            toast.error(error.message || 'Action failed', { id: toastId })
            return null
        } finally {
            setRunningAction('')
        }
    }

    const handleImport = async (e) => {
        e.preventDefault()
        if (!importForm.url.trim()) {
            toast.error('Paste an Amazon or amzn.to URL')
            return
        }

        const result = await runAction('importProduct', {
            url: importForm.url,
            title: importForm.title,
            brand: importForm.brand,
            categoryId: importForm.categoryId,
            tags: importForm.tags,
            isFeatured: importForm.isFeatured,
            isActive: importForm.isActive,
        }, 'Importing product from link...')

        if (result?.success) {
            setImportForm((prev) => ({ ...prev, url: '', title: '', brand: '', tags: '' }))
        }
    }

    const addCustomTemplate = () => {
        const key = String(newTemplate.key || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_')
        const label = String(newTemplate.label || '').trim()
        const body = String(newTemplate.body || '').trim()

        if (!key || !body) {
            toast.error('Template key and body are required')
            return
        }

        const current = Array.isArray(config?.templates?.customTemplates) ? config.templates.customTemplates : []
        const exists = current.some((item) => item.key === key)
        if (exists) {
            toast.error('Template key already exists')
            return
        }

        setConfig((prev) => ({
            ...prev,
            templates: {
                ...(prev.templates || {}),
                customTemplates: [...current, { key, label: label || key, body }],
            },
        }))
        setNewTemplate({ key: '', label: '', body: '' })
    }

    const removeCustomTemplate = (key) => {
        const current = Array.isArray(config?.templates?.customTemplates) ? config.templates.customTemplates : []
        setConfig((prev) => ({
            ...prev,
            templates: {
                ...(prev.templates || {}),
                customTemplates: current.filter((item) => item.key !== key),
            },
        }))
    }

    const insertShortcutToTemplate = (target, tokenName) => {
        const token = toToken(tokenName)
        setConfig((prev) => ({
            ...prev,
            templates: {
                ...(prev.templates || {}),
                [target]: `${String(prev?.templates?.[target] || '')}${String(prev?.templates?.[target] ? ' ' : '')}${token}`,
            },
        }))
    }

    const insertShortcutToCustomTemplate = (tokenName) => {
        const token = toToken(tokenName)
        setNewTemplate((prev) => ({
            ...prev,
            body: `${String(prev.body || '')}${String(prev.body ? ' ' : '')}${token}`,
        }))
    }

    const applySeedTemplate = (seed) => {
        setNewTemplate({
            key: seed.key,
            label: seed.label,
            body: seed.body,
        })
    }

    const insertEmojiToCustomTemplate = (emoji) => {
        setNewTemplate((prev) => ({
            ...prev,
            body: `${String(prev.body || '')}${emoji}`,
        }))
    }

    const insertEmojiToManualMessage = (emoji) => {
        setManualSend((prev) => ({
            ...prev,
            message: `${String(prev.message || '')}${emoji}`,
        }))
    }

    const applySelectedProductToManualVariables = (nextProductId) => {
        const selectedProduct = manualProducts.find((item) => item.id === nextProductId) || null
        const productVariables = buildManualVariablesFromProduct(selectedProduct)

        let currentVariables = {}
        if (manualSend.variablesJson.trim()) {
            try {
                currentVariables = JSON.parse(manualSend.variablesJson)
            } catch {
                currentVariables = {}
            }
        }

        setManualSend((prev) => ({
            ...prev,
            productId: nextProductId,
            variablesJson: JSON.stringify({
                ...currentVariables,
                ...productVariables,
            }, null, 2),
        }))
    }

    const sendManualMessage = async (e) => {
        e.preventDefault()
        let parsedVariables = {}

        if (manualSend.variablesJson.trim()) {
            try {
                parsedVariables = JSON.parse(manualSend.variablesJson)
            } catch {
                toast.error('Variables JSON is invalid')
                return
            }
        }

        const result = await runAction('manualSend', {
            message: manualSend.message,
            templateKey: manualSend.templateKey,
            variables: parsedVariables,
            productId: manualSend.productId,
            includeImage: manualSend.includeImage,
        }, 'Sending manual message...')

        if (result?.success) {
            setManualSend((prev) => ({ ...prev, message: '' }))
        }
    }

    const recentRuns = Array.isArray(stats.recentRuns) ? stats.recentRuns : []
    const recentMessages = Array.isArray(stats.lastMessages) ? stats.lastMessages : []
    const selectedManualProduct = manualProducts.find((item) => item.id === manualSend.productId) || null
    const filteredManualProducts = useMemo(() => {
        const q = manualProductSearch.trim().toLowerCase()
        if (!q) return manualProducts.slice(0, 200)
        return manualProducts
            .filter((item) => `${item.title || ''} ${item.brand || ''}`.toLowerCase().includes(q))
            .slice(0, 200)
    }, [manualProducts, manualProductSearch])

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading Telegram manager...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-16">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Telegram Manager</h1>
                <p className="mt-1 text-sm text-slate-500">Manage bot settings, templates, automation, and product imports from links.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Active Products" value={stats.activeProducts || 0} helper="Products currently active" icon={BoxSeam} />
                <StatCard label="Published" value={stats.publishedProducts || 0} helper="Sent to Telegram channel" icon={CheckCircleFill} />
                <StatCard label="Pending Posts" value={stats.pendingCatalogPosts || 0} helper="Not posted yet" icon={ClockHistory} />
                <StatCard label="Bot Status" value={status.ready ? 'Ready' : 'Setup'} helper={status.ready ? 'Connected' : 'Needs bot token/chat id'} icon={Gear} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${activeTab === tab.id ? 'bg-black text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'add-product' && (
                <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                        <SectionTitle
                            eyebrow="Import"
                            title="Add Product By Link"
                            description="Paste Amazon URL, import full product data, and save directly into your products collection."
                        />

                        <form onSubmit={handleImport} className="space-y-4">
                            <label className="space-y-1.5 text-sm block">
                                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Product Link</span>
                                <input
                                    value={importForm.url}
                                    onChange={(e) => setImportForm((prev) => ({ ...prev, url: e.target.value }))}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                                    placeholder="https://www.amazon.in/dp/..."
                                />
                            </label>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-1.5 text-sm block">
                                    <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Category</span>
                                    <select
                                        value={importForm.categoryId}
                                        onChange={(e) => setImportForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400 bg-white"
                                    >
                                        <option value="">No category</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="space-y-1.5 text-sm block">
                                    <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Brand Override</span>
                                    <input
                                        value={importForm.brand}
                                        onChange={(e) => setImportForm((prev) => ({ ...prev, brand: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                                        placeholder="Optional"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-1.5 text-sm block">
                                    <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Title Override</span>
                                    <input
                                        value={importForm.title}
                                        onChange={(e) => setImportForm((prev) => ({ ...prev, title: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                                        placeholder="Optional"
                                    />
                                </label>

                                <label className="space-y-1.5 text-sm block">
                                    <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tags</span>
                                    <input
                                        value={importForm.tags}
                                        onChange={(e) => setImportForm((prev) => ({ ...prev, tags: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                                        placeholder="Comma separated"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">Featured</p>
                                        <p className="text-xs text-slate-400">Sets featured flags</p>
                                    </div>
                                    <input type="checkbox" checked={importForm.isFeatured} onChange={(e) => setImportForm((prev) => ({ ...prev, isFeatured: e.target.checked }))} className="h-4 w-4" />
                                </label>
                                <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">Active</p>
                                        <p className="text-xs text-slate-400">Visible on site</p>
                                    </div>
                                    <input type="checkbox" checked={importForm.isActive} onChange={(e) => setImportForm((prev) => ({ ...prev, isActive: e.target.checked }))} className="h-4 w-4" />
                                </label>
                            </div>

                            <button type="submit" disabled={runningAction || saving} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-60">
                                <ArrowRepeat size={14} className={runningAction === 'importProduct' ? 'animate-spin' : ''} />
                                Import Product
                            </button>
                        </form>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                        <SectionTitle
                            eyebrow="Imported"
                            title="Recently imported"
                            description="Products added or updated from this tab."
                        />

                        <div className="space-y-3">
                            {importedProducts.length > 0 ? importedProducts.map((item) => (
                                <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 break-words">{item.title || 'Untitled product'}</p>
                                            <p className="mt-1 text-xs text-slate-500">{item.mode || 'created'} • {item.productId || '—'}</p>
                                            <p className="mt-1 text-xs text-slate-500 break-all">{item.affiliateUrl || '—'}</p>
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                                                {item.originalPrice ? (
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 line-through">{formatPriceDisplay(item.originalPrice)}</span>
                                                ) : null}
                                                {item.price ? (
                                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">Now {formatPriceDisplay(item.price)}</span>
                                                ) : null}
                                                {Number(item.discount) > 0 ? (
                                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">{item.discount}% off</span>
                                                ) : null}
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                                {item.brand ? <span>Brand: {item.brand}</span> : null}
                                                {item.asin ? <span>ASIN: {item.asin}</span> : null}
                                                {item.imageCount ? <span>Images: {item.imageCount}</span> : null}
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-2">
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">{item.price ? formatPriceDisplay(item.price) : '—'}</span>
                                            {item.imageUrl ? (
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.title || 'Imported product'}
                                                    className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : null}
                                        </div>
                                    </div>
                                    <p className="mt-2 text-[11px] text-slate-400">{formatDateTime(item.createdAt)}</p>
                                </div>
                            )) : (
                                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">No imports yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'templates' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                    <SectionTitle
                        eyebrow="Templates"
                        title="Message template configuration"
                        description={`Use placeholders: ${toToken('title')}, ${toToken('price')}, ${toToken('productUrl')}, ${toToken('affiliateUrl')}, ${toToken('oldPrice')}, ${toToken('newPrice')}, ${toToken('dropPercent')}, ${toToken('adminUrl')}.`}
                    />

                    <label className="space-y-1.5 text-sm block">
                        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Catalog Template</span>
                        <textarea rows={6} value={config.templates?.catalog || ''} onChange={(e) => updateTemplate('catalog', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400" />
                        <div className="flex flex-wrap gap-2 pt-1">
                            {['title', 'price', 'productUrl', 'affiliateUrl'].map((name) => (
                                <button
                                    key={`catalog-${name}`}
                                    type="button"
                                    onClick={() => insertShortcutToTemplate('catalog', name)}
                                    className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                                >
                                    + {toToken(name)}
                                </button>
                            ))}
                        </div>
                    </label>

                    <label className="space-y-1.5 text-sm block">
                        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Price Drop Template</span>
                        <textarea rows={6} value={config.templates?.priceDrop || ''} onChange={(e) => updateTemplate('priceDrop', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400" />
                        <div className="flex flex-wrap gap-2 pt-1">
                            {['title', 'oldPrice', 'newPrice', 'dropPercent', 'productUrl'].map((name) => (
                                <button
                                    key={`drop-${name}`}
                                    type="button"
                                    onClick={() => insertShortcutToTemplate('priceDrop', name)}
                                    className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                                >
                                    + {toToken(name)}
                                </button>
                            ))}
                        </div>
                    </label>

                    <label className="space-y-1.5 text-sm block">
                        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Test Template</span>
                        <textarea rows={4} value={config.templates?.test || ''} onChange={(e) => updateTemplate('test', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400" />
                        <div className="flex flex-wrap gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => insertShortcutToTemplate('test', 'adminUrl')}
                                className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                            >
                                + {toToken('adminUrl')}
                            </button>
                        </div>
                    </label>

                    <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Custom Templates (Emoji Supported)</p>

                        <div className="flex flex-wrap gap-2">
                            {EMOJI_SEEDS.map((emoji) => (
                                <button
                                    key={`emoji-seed-${emoji}`}
                                    type="button"
                                    onClick={() => insertEmojiToCustomTemplate(emoji)}
                                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Template Seeds (1-click)</p>
                            <div className="flex flex-wrap gap-2">
                                {TEMPLATE_SEEDS.map((seed) => (
                                    <button
                                        key={seed.key}
                                        type="button"
                                        onClick={() => applySeedTemplate(seed)}
                                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                                    >
                                        Use {seed.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <input value={newTemplate.key} onChange={(e) => setNewTemplate((prev) => ({ ...prev, key: e.target.value }))} placeholder="template_key" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
                            <input value={newTemplate.label} onChange={(e) => setNewTemplate((prev) => ({ ...prev, label: e.target.value }))} placeholder="Template Label" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
                        </div>
                        <textarea rows={4} value={newTemplate.body} onChange={(e) => setNewTemplate((prev) => ({ ...prev, body: e.target.value }))} placeholder={`🔥 Deal Alert for ${toToken('title')}\nPrice: ${toToken('price')}\n👉 ${toToken('productUrl')}`} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
                        <div className="flex flex-wrap gap-2 pt-1">
                            {TEMPLATE_SHORTCUTS.map((name) => (
                                <button
                                    key={`custom-${name}`}
                                    type="button"
                                    onClick={() => insertShortcutToCustomTemplate(name)}
                                    className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                                >
                                    + {toToken(name)}
                                </button>
                            ))}
                        </div>
                        <button type="button" onClick={addCustomTemplate} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            <CardText size={14} /> Add Template
                        </button>

                        <div className="space-y-2">
                            {(Array.isArray(config?.templates?.customTemplates) ? config.templates.customTemplates : []).length > 0 ? (
                                (config.templates.customTemplates || []).map((tpl) => (
                                    <div key={tpl.key} className="rounded-lg border border-slate-200 p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-medium text-slate-800">{tpl.label || tpl.key}</p>
                                            <button type="button" onClick={() => removeCustomTemplate(tpl.key)} className="text-xs text-rose-600 hover:underline">Remove</button>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-400">Key: {tpl.key}</p>
                                        <p className="mt-2 text-xs text-slate-600 whitespace-pre-wrap break-words">{tpl.body}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-400">No custom templates yet.</p>
                            )}
                        </div>
                    </div>

                    <button type="button" onClick={() => saveConfig('Templates saved')} disabled={saving || runningAction} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-60">
                        <Gear size={14} />
                        {saving ? 'Saving...' : 'Save Templates'}
                    </button>
                </div>
            )}

            {activeTab === 'manual-send' && (
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <form onSubmit={sendManualMessage} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                        <SectionTitle
                            eyebrow="Manual Send"
                            title="Send message to Telegram now"
                            description="You can type a direct message with emoji or select a template and send with variables."
                        />

                        <label className="space-y-1.5 text-sm block">
                            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Template (optional)</span>
                            <select value={manualSend.templateKey} onChange={(e) => setManualSend((prev) => ({ ...prev, templateKey: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400 bg-white">
                                <option value="">No template (use manual message)</option>
                                <option value="catalog">Built-in: catalog</option>
                                <option value="priceDrop">Built-in: priceDrop</option>
                                <option value="test">Built-in: test</option>
                                {(Array.isArray(config?.templates?.customTemplates) ? config.templates.customTemplates : []).map((tpl) => (
                                    <option key={tpl.key} value={tpl.key}>Custom: {tpl.label || tpl.key}</option>
                                ))}
                            </select>
                        </label>

                        <label className="space-y-1.5 text-sm block">
                            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Product (optional)</span>
                            <input
                                value={manualProductSearch}
                                onChange={(e) => setManualProductSearch(e.target.value)}
                                placeholder="Search product title or brand"
                                className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                            />
                            <select
                                value={manualSend.productId}
                                onChange={(e) => applySelectedProductToManualVariables(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400 bg-white"
                            >
                                <option value="">No product selected</option>
                                {filteredManualProducts.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {shortenText(product.title)} {product.price ? `• ${formatPriceDisplay(product.price)}` : ''}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                            <div>
                                <p className="text-sm font-medium text-slate-800">Send product image</p>
                                <p className="text-xs text-slate-400">If selected product has an image, send it with caption.</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={Boolean(manualSend.includeImage)}
                                onChange={(e) => setManualSend((prev) => ({ ...prev, includeImage: e.target.checked }))}
                                className="h-4 w-4"
                            />
                        </label>

                        {selectedManualProduct?.imageUrl ? (
                            <div className="rounded-xl border border-slate-200 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-2">Selected Product Image Preview</p>
                                <img
                                    src={selectedManualProduct.imageUrl}
                                    alt={selectedManualProduct.title || 'Selected product'}
                                    className="h-28 w-28 rounded-lg object-cover border border-slate-200"
                                />
                            </div>
                        ) : null}

                        <label className="space-y-1.5 text-sm block">
                            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Manual Message (emoji supported)</span>
                            <div className="mb-2 flex flex-wrap gap-2">
                                {EMOJI_SEEDS.map((emoji) => (
                                    <button
                                        key={`manual-emoji-${emoji}`}
                                        type="button"
                                        onClick={() => insertEmojiToManualMessage(emoji)}
                                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                            <textarea rows={7} value={manualSend.message} onChange={(e) => setManualSend((prev) => ({ ...prev, message: e.target.value }))} placeholder="🔥 Big Deal Alert\n📦 Product: XYZ\n💰 Price: ₹999\n👉 https://..." className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400" />
                        </label>

                        <label className="space-y-1.5 text-sm block">
                            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Template Variables JSON</span>
                            <textarea rows={8} value={manualSend.variablesJson} onChange={(e) => setManualSend((prev) => ({ ...prev, variablesJson: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-xs outline-none focus:border-slate-400" />
                        </label>

                        <button type="submit" disabled={runningAction || saving} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-60">
                            <SendFill size={14} />
                            Send Message
                        </button>
                    </form>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                        <SectionTitle
                            eyebrow="Tips"
                            title="Template + Emoji examples"
                            description="You can use HTML tags supported by Telegram and emoji directly in templates."
                        />
                        <div className="space-y-3 text-sm text-slate-600">
                            <p>Example: <span className="font-mono">{`🔥 <b>Deal Alert</b> for ${toToken('title')}`}</span></p>
                            <p>Example: <span className="font-mono">{`💸 Now ${toToken('newPrice')} (was ${toToken('oldPrice')})`}</span></p>
                            <p>Use placeholders: <span className="font-mono">{`${toToken('title')}, ${toToken('price')}, ${toToken('productUrl')}, ${toToken('affiliateUrl')}, ${toToken('dropPercent')}`}</span></p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'automation' && (
                <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                        <SectionTitle
                            eyebrow="Automation"
                            title="Auto tracker and publish settings"
                            description="Configure run frequency, crawler limits, delays, and threshold for price-drop alerts."
                        />

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <label className="space-y-1.5 text-sm">
                                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Frequency (minutes)</span>
                                <input type="number" min="15" value={config.frequencyMinutes} onChange={(e) => updateField('frequencyMinutes', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400" />
                            </label>
                            <label className="space-y-1.5 text-sm">
                                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Products per run</span>
                                <input type="number" min="1" value={config.maxPerRun} onChange={(e) => updateField('maxPerRun', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400" />
                            </label>
                            <label className="space-y-1.5 text-sm">
                                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Delay (ms)</span>
                                <input type="number" min="0" value={config.delayMs} onChange={(e) => updateField('delayMs', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400" />
                            </label>
                            <label className="space-y-1.5 text-sm">
                                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Min drop %</span>
                                <input type="number" min="0" value={config.minimumPriceDropPercent} onChange={(e) => updateField('minimumPriceDropPercent', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400" />
                            </label>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-800">Publish missing products</p>
                                    <p className="text-xs text-slate-400">Posts pending catalog products.</p>
                                </div>
                                <input type="checkbox" checked={Boolean(config.publishNewProducts)} onChange={(e) => updateField('publishNewProducts', e.target.checked)} className="h-4 w-4" />
                            </label>
                            <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-800">Price tracker enabled</p>
                                    <p className="text-xs text-slate-400">Allows cron and manual tracking.</p>
                                </div>
                                <input type="checkbox" checked={Boolean(config.priceTrackerEnabled)} onChange={(e) => updateField('priceTrackerEnabled', e.target.checked)} className="h-4 w-4" />
                            </label>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => runAction('publishCatalog', { delayMs: config.delayMs }, 'Publishing missing products...')} disabled={runningAction || saving} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-60">
                                <BoxSeam size={14} />
                                Publish Missing Products
                            </button>
                            <button type="button" onClick={() => runAction('priceTrack', { limit: config.maxPerRun, delayMs: config.delayMs }, 'Running price tracker...')} disabled={runningAction || saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60">
                                <LightningChargeFill size={14} />
                                Run Price Tracker
                            </button>
                            <button type="button" onClick={() => saveConfig('Automation settings saved')} disabled={saving || runningAction} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                                <Gear size={14} />
                                {saving ? 'Saving...' : 'Save Automation'}
                            </button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                        <SectionTitle eyebrow="Runs" title="Recent tracker runs" description="Last automation runs and outcomes." />
                        <div className="space-y-3">
                            {recentRuns.length > 0 ? recentRuns.slice(0, 8).map((run) => (
                                <div key={run.id} className="rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-slate-800">{run.runId || 'Run'}</p>
                                        <span className="text-xs text-slate-500">{formatDateTime(run.createdAt)}</span>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500">Checked {run.summary?.checked || 0}, updated {run.summary?.updated || 0}, alerts {run.summary?.alertsSent || 0}, failed {run.summary?.failed || 0}</p>
                                </div>
                            )) : (
                                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">No tracker runs yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'bot' && (
                <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                        <SectionTitle
                            eyebrow="Bot"
                            title="Bot settings"
                            description="Bot Settings is the last tab as requested. Configure token, chat ID, and toggle enable state here."
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="space-y-1.5 text-sm block">
                                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Enabled</span>
                                <select value={config.enabled ? 'true' : 'false'} onChange={(e) => updateField('enabled', e.target.value === 'true')} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400">
                                    <option value="false">Disabled</option>
                                    <option value="true">Enabled</option>
                                </select>
                            </label>

                            <label className="space-y-1.5 text-sm block">
                                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Chat ID</span>
                                <input value={config.chatId} onChange={(e) => updateField('chatId', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400" placeholder="@your_channel or numeric id" />
                            </label>

                            <label className="space-y-1.5 text-sm md:col-span-2 block">
                                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Bot Token</span>
                                <input value={config.botToken} onChange={(e) => updateField('botToken', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400" placeholder="123456789:AA..." />
                            </label>

                            <label className="space-y-1.5 text-sm md:col-span-2 block">
                                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Test Message Template</span>
                                <textarea
                                    rows={4}
                                    value={config.templates?.test || ''}
                                    onChange={(e) => updateTemplate('test', e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                                    placeholder={`<b>TEKPIK Telegram Test</b>\nOpen: ${toToken('adminUrl')}`}
                                />
                                <p className="text-[11px] text-slate-400">This test message can be edited directly from Bot Settings.</p>
                            </label>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => saveConfig('Bot settings saved')} disabled={saving || runningAction} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-60">
                                <Gear size={14} />
                                {saving ? 'Saving...' : 'Save Bot Settings'}
                            </button>
                            <button type="button" onClick={() => runAction('test', { testMessage: config.templates?.test || '' }, 'Sending test message...')} disabled={runningAction || saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                                <SendFill size={14} />
                                Test Telegram
                            </button>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                            <Link href="/admin/docs/botbuild" className="text-sm text-indigo-600 hover:underline">
                                Need help building bot from scratch? Open Bot Build Guide
                            </Link>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                            <SectionTitle eyebrow="Health" title="Bot readiness" description="Quick status checks for Telegram bot connectivity." />
                            <div className="space-y-2 text-sm">
                                <HealthRow label="Enabled" value={status.enabled ? 'Yes' : 'No'} ok={status.enabled} />
                                <HealthRow label="Bot token configured" value={status.botTokenConfigured ? 'Yes' : 'No'} ok={status.botTokenConfigured} />
                                <HealthRow label="Chat ID configured" value={status.chatIdConfigured ? 'Yes' : 'No'} ok={status.chatIdConfigured} />
                                <HealthRow label="Ready" value={status.ready ? 'Yes' : 'No'} ok={status.ready} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'message-history' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                    <SectionTitle eyebrow="Messages" title="Recent Telegram messages" description="Latest catalog posts, tests, and alerts." />
                    <div className="space-y-3">
                        {recentMessages.length > 0 ? recentMessages.slice(0, 20).map((item) => (
                            <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800">{item.productTitle || item.type || 'Telegram message'}</p>
                                        <p className="mt-1 text-xs text-slate-500 break-words">{item.message || '—'}</p>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">{item.status || 'ok'}</span>
                                </div>
                                <p className="mt-2 text-[11px] text-slate-400">{formatDateTime(item.createdAt)}</p>
                            </div>
                        )) : (
                            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">No Telegram activity yet.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
