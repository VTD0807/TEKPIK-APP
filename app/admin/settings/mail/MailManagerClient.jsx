'use client'
import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
    EnvelopeFill, PlusLg, Trash, PencilFill, SendFill,
    ClockHistory, Eye, EyeSlash, PeopleFill, Stars,
    CheckCircleFill, ArrowRepeat, ChevronDown, ChevronUp,
} from 'react-bootstrap-icons'

const TABS = ['Compose', 'Templates', 'Audience', 'Server', 'Logs']
const fmtDate = v => v ? new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const fmtNum = n => Number.isFinite(Number(n)) ? Number(n).toLocaleString('en-IN') : '—'

export default function MailManagerClient() {
    const [tab, setTab] = useState('Compose')
    const [composePreset, setComposePreset] = useState(null) // { audienceId, audienceName }

    const composeForSegment = (seg) => {
        setComposePreset({ audienceId: seg.id, audienceName: seg.name, userCount: seg.userCount })
        setTab('Compose')
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Mail Manager</h1>
                    <p className="mt-1 text-sm text-slate-500">Compose broadcasts, manage templates, segment your audience, and track delivery.</p>
                </div>
            </div>
            <div className="flex gap-1 border-b border-slate-200">
                {TABS.map(t => (
                    <button key={t} onClick={() => { setTab(t); if (t !== 'Compose') setComposePreset(null) }}
                        className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${tab === t ? 'border-black text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        {t}
                    </button>
                ))}
            </div>
            {tab === 'Compose' && <ComposeTab preset={composePreset} clearPreset={() => setComposePreset(null)} />}
            {tab === 'Templates' && <TemplatesTab />}
            {tab === 'Audience' && <AudienceTab onCompose={composeForSegment} />}
            {tab === 'Server' && <ServerTab />}
            {tab === 'Logs' && <LogsTab />}
        </div>
    )
}

// ─── Compose Tab ──────────────────────────────────────────────────────────────
function ComposeTab({ preset, clearPreset }) {
    const MODES = ['segment', 'custom', 'broadcast']
    const MODE_LABELS = { segment: 'Audience Segment', custom: 'Custom Emails', broadcast: 'All Users' }

    const [sendMode, setSendMode] = useState(preset ? 'segment' : 'segment')
    const [form, setForm] = useState({ subject: '', bodyHtml: '', ctaLabel: '', ctaUrl: '', templateId: '', audienceId: preset?.audienceId || 'all' })
    const [templates, setTemplates] = useState([])
    const [segments, setSegments] = useState([])
    const [customEmails, setCustomEmails] = useState([])
    const [emailInput, setEmailInput] = useState('')
    const [sending, setSending] = useState(false)
    const [preview, setPreview] = useState(false)
    const [recipientCount, setRecipientCount] = useState(preset?.userCount ?? null)
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

    // Apply preset from Audience tab shortcut
    useEffect(() => {
        if (preset) {
            setSendMode('segment')
            set('audienceId', preset.audienceId)
            setRecipientCount(preset.userCount)
        }
    }, [preset])

    useEffect(() => {
        Promise.all([
            fetch('/api/admin/mail/templates').then(r => r.json()).catch(() => ({})),
            fetch('/api/admin/mail/audience').then(r => r.json()).catch(() => ({})),
        ]).then(([td, ad]) => {
            setTemplates(td.templates || [])
            const segs = ad.segments || []
            setSegments(segs)
            if (!preset) {
                const all = segs.find(s => s.id === 'all')
                if (all) setRecipientCount(all.userCount)
            }
        })
    }, [])

    useEffect(() => {
        if (sendMode === 'segment') {
            const seg = segments.find(s => s.id === form.audienceId)
            setRecipientCount(seg?.userCount ?? null)
        } else if (sendMode === 'custom') {
            setRecipientCount(customEmails.length || null)
        } else {
            const all = segments.find(s => s.id === 'all')
            setRecipientCount(all?.userCount ?? null)
        }
    }, [form.audienceId, segments, sendMode, customEmails])

    useEffect(() => {
        if (!form.templateId) return
        const tpl = templates.find(t => t.id === form.templateId)
        if (tpl && !form.subject) set('subject', tpl.subject)
    }, [form.templateId])

    // Email chip handlers
    const addEmail = (raw) => {
        const email = raw.trim().toLowerCase()
        if (email && email.includes('@') && !customEmails.includes(email)) {
            setCustomEmails(prev => [...prev, email])
        }
        setEmailInput('')
    }
    const handleEmailKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(emailInput) }
        if (e.key === 'Backspace' && !emailInput && customEmails.length) {
            setCustomEmails(prev => prev.slice(0, -1))
        }
    }
    const removeEmail = (email) => setCustomEmails(prev => prev.filter(e => e !== email))

    const handleSend = async () => {
        if (!form.subject) return toast.error('Subject is required')
        if (!form.bodyHtml && !form.templateId) return toast.error('Body or template is required')
        if (sendMode === 'custom' && !customEmails.length) return toast.error('Add at least one email')

        const count = sendMode === 'custom' ? customEmails.length : recipientCount
        if (!confirm(`Send to ${fmtNum(count)} recipient${count !== 1 ? 's' : ''}?`)) return

        setSending(true)
        const tid = toast.loading('Sending...')
        try {
            const payload = { ...form }
            if (sendMode === 'segment') {
                payload.type = 'segment'
                payload.audienceId = form.audienceId
            } else if (sendMode === 'custom') {
                payload.type = 'custom'
                payload.customEmails = customEmails
            } else {
                payload.type = 'broadcast'
            }

            const res = await fetch('/api/admin/mail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed')
            toast.success(`Sent to ${fmtNum(data.sent)} recipients`, { id: tid })
            setForm({ subject: '', bodyHtml: '', ctaLabel: '', ctaUrl: '', templateId: '', audienceId: 'all' })
            setCustomEmails([])
            if (clearPreset) clearPreset()
        } catch (err) {
            toast.error(err.message, { id: tid })
        } finally {
            setSending(false)
        }
    }

    const selectedTemplate = templates.find(t => t.id === form.templateId)

    return (
        <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <EnvelopeFill size={15} className="text-slate-500" />
                    <h2 className="text-base font-semibold text-slate-900">Compose Email</h2>
                </div>

                {/* Preset banner */}
                {preset && sendMode === 'segment' && (
                    <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-2.5 flex items-center justify-between">
                        <p className="text-xs text-blue-700"><span className="font-semibold">Targeting:</span> {preset.audienceName} ({fmtNum(preset.userCount)} users)</p>
                        <button onClick={() => { clearPreset(); set('audienceId', 'all') }} className="text-[11px] text-blue-500 hover:text-blue-700 underline">Clear</button>
                    </div>
                )}

                {/* Send Mode Toggle */}
                <div className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Send Mode</span>
                    <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                        {MODES.map(m => (
                            <button key={m} onClick={() => setSendMode(m)}
                                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${sendMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {MODE_LABELS[m]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Segment selector */}
                {sendMode === 'segment' && (
                    <label className="block space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Audience Segment</span>
                        <select value={form.audienceId} onChange={e => set('audienceId', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400">
                            {segments.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({fmtNum(s.userCount)} users)</option>
                            ))}
                            {!segments.length && <option value="all">All Users</option>}
                        </select>
                    </label>
                )}

                {/* Custom email chips */}
                {sendMode === 'custom' && (
                    <div className="space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Recipients</span>
                        <div className="rounded-xl border border-slate-200 px-3 py-2 flex flex-wrap gap-1.5 min-h-[42px] focus-within:border-slate-400 transition">
                            {customEmails.map(email => (
                                <span key={email} className="inline-flex items-center gap-1 rounded-full bg-slate-100 pl-2.5 pr-1 py-0.5 text-xs text-slate-700">
                                    {email}
                                    <button onClick={() => removeEmail(email)} className="rounded-full hover:bg-slate-200 p-0.5 transition">
                                        <Trash size={10} />
                                    </button>
                                </span>
                            ))}
                            <input value={emailInput} onChange={e => setEmailInput(e.target.value)}
                                onKeyDown={handleEmailKeyDown}
                                onBlur={() => emailInput && addEmail(emailInput)}
                                placeholder={customEmails.length ? '' : 'Type email and press Enter...'}
                                className="flex-1 min-w-[180px] outline-none text-sm bg-transparent py-0.5" />
                        </div>
                        <p className="text-[11px] text-slate-400">Press Enter or comma to add. Backspace to remove last.</p>
                    </div>
                )}

                {/* Recipient count */}
                {recipientCount !== null && (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                        <PeopleFill size={11} /> {fmtNum(recipientCount)} recipient{recipientCount !== 1 ? 's' : ''}
                    </p>
                )}

                {/* Template picker */}
                <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Template</span>
                    <select value={form.templateId} onChange={e => set('templateId', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400">
                        <option value="">— Write custom body —</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </label>

                {/* Subject */}
                <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Subject</span>
                    <input value={form.subject} onChange={e => set('subject', e.target.value)}
                        placeholder="Your subject line..."
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
                </label>

                {/* Body */}
                {!form.templateId && (
                    <label className="block space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Body (HTML)</span>
                        <textarea value={form.bodyHtml} onChange={e => set('bodyHtml', e.target.value)}
                            rows={8} placeholder="<p>Hello {{name}},</p><p>Your message here...</p>"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono outline-none focus:border-slate-400 resize-y" />
                    </label>
                )}

                {selectedTemplate?.variables?.length > 0 && (
                    <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 space-y-1.5">
                        <p className="text-xs font-semibold text-violet-700">Template variables</p>
                        <div className="flex flex-wrap gap-1.5">
                            {selectedTemplate.variables.map(v => (
                                <span key={v} className="rounded-full bg-white border border-violet-200 text-violet-700 text-[11px] px-2 py-0.5 font-mono">{`{{${v}}}`}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* CTA */}
                <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">CTA Label</span>
                        <input value={form.ctaLabel} onChange={e => set('ctaLabel', e.target.value)} placeholder="Shop Now →"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
                    </label>
                    <label className="block space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">CTA URL</span>
                        <input value={form.ctaUrl} onChange={e => set('ctaUrl', e.target.value)} placeholder="https://tekpik.in/..."
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
                    </label>
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <button onClick={handleSend} disabled={sending}
                        className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60 transition">
                        <SendFill size={13} />
                        {sending ? 'Sending...' : `Send to ${fmtNum(recipientCount) || 'All'}`}
                    </button>
                    <button onClick={() => setPreview(p => !p)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition">
                        {preview ? <EyeSlash size={13} /> : <Eye size={13} />}
                        {preview ? 'Hide Preview' : 'Preview'}
                    </button>
                </div>
            </div>

            {preview && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 px-5 py-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Preview</p>
                        <p className="text-sm font-medium text-slate-800 mt-0.5">{form.subject || '(no subject)'}</p>
                    </div>
                    <div className="p-4 overflow-auto max-h-[600px] text-sm"
                        dangerouslySetInnerHTML={{ __html: form.bodyHtml || (selectedTemplate?.html || '<p style="color:#94a3b8">Select a template or write a body to preview.</p>') }} />
                </div>
            )}
        </div>
    )
}



// ─── Templates Tab ────────────────────────────────────────────────────────────
function TemplatesTab() {
    const [templates, setTemplates] = useState([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [seeding, setSeeding] = useState(false)
    const [form, setForm] = useState({ name: '', subject: '', html: '' })
    const [expanded, setExpanded] = useState(null)
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/mail/templates')
            const data = await res.json()
            setTemplates(data.templates || [])
        } catch { /* ignore */ }
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const handleCreate = async () => {
        if (!form.name || !form.subject || !form.html) return toast.error('All fields are required')
        setCreating(true)
        const tid = toast.loading('Saving template...')
        try {
            const res = await fetch('/api/admin/mail/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed')
            toast.success('Template saved', { id: tid })
            setForm({ name: '', subject: '', html: '' })
            load()
        } catch (err) {
            toast.error(err.message, { id: tid })
        } finally {
            setCreating(false)
        }
    }

    const handleSeed = async () => {
        if (!confirm('This will load 15 professional HTML templates. Continue?')) return
        setSeeding(true)
        const tid = toast.loading('Seeding templates...')
        try {
            const res = await fetch('/api/admin/mail/seed-templates', { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to seed')
            toast.success(`Seeded ${data.added} templates (skipped ${data.skipped})`, { id: tid })
            load()
        } catch (err) {
            toast.error(err.message, { id: tid })
        } finally {
            setSeeding(false)
        }
    }

    return (
        <div className="grid gap-6 xl:grid-cols-2">
            {/* Create form */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <Stars size={15} className="text-slate-500" />
                    <h2 className="text-base font-semibold text-slate-900">New Template</h2>
                </div>
                <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Name</span>
                    <input value={form.name} onChange={e => set('name', e.target.value)}
                        placeholder="Welcome Email"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
                </label>
                <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Subject</span>
                    <input value={form.subject} onChange={e => set('subject', e.target.value)}
                        placeholder="Welcome to TekPik!"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
                </label>
                <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">HTML Body</span>
                    <textarea value={form.html} onChange={e => set('html', e.target.value)}
                        rows={8} placeholder="<p>Hello {{name}},</p>"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono outline-none focus:border-slate-400 resize-y" />
                </label>
                <button onClick={handleCreate} disabled={creating}
                    className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60 transition">
                    <PlusLg size={13} />
                    {creating ? 'Saving...' : 'Save Template'}
                </button>
            </div>

            {/* List */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col max-h-[800px]">
                <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <h2 className="text-base font-semibold text-slate-900">Saved Templates</h2>
                        <button onClick={handleSeed} disabled={seeding}
                            className="inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm">
                            <Stars size={10} className="text-amber-500" />
                            Seed Defaults
                        </button>
                    </div>
                    <button onClick={load} className="text-slate-400 hover:text-slate-600 transition"><ArrowRepeat size={15} /></button>
                </div>
                <div className="overflow-y-auto flex-1">
                    {loading ? (
                        <p className="px-5 py-8 text-center text-sm text-slate-400">Loading...</p>
                    ) : !templates.length ? (
                        <div className="px-5 py-12 text-center space-y-3 flex flex-col items-center justify-center">
                            <p className="text-sm text-slate-400">No templates yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {templates.map(t => (
                                <div key={t.id} className="px-5 py-3">
                                    <button onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                                        className="w-full flex items-center justify-between text-left group">
                                        <div>
                                            <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">{t.name}</p>
                                            <p className="text-xs text-slate-400">{t.subject} · {fmtDate(t.createdAt)}</p>
                                        </div>
                                        {expanded === t.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                    </button>
                                    {expanded === t.id && (
                                        <div className="mt-3 space-y-2">
                                            {t.variables?.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {t.variables.map(v => (
                                                        <span key={v} className="rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[11px] px-2 py-0.5 font-mono">{`{{${v}}}`}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-mono text-slate-600 overflow-auto max-h-48 whitespace-pre-wrap">
                                                {t.html}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Audience Tab ─────────────────────────────────────────────────────────────
function AudienceTab({ onCompose }) {
    const [segments, setSegments] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [totalUsers, setTotalUsers] = useState(0)
    const [lastAnalysed, setLastAnalysed] = useState(null)
    const [cached, setCached] = useState(false)

    const load = useCallback(async (refresh = false) => {
        if (refresh) setRefreshing(true); else setLoading(true)
        try {
            const url = refresh ? '/api/admin/mail/audience?refresh=true' : '/api/admin/mail/audience'
            const res = await fetch(url)
            const data = await res.json()
            setSegments(data.segments || [])
            setTotalUsers(data.totalUsers || 0)
            setLastAnalysed(data.lastAnalysedAt || null)
            setCached(!!data.cached)
        } catch { /* ignore */ }
        setLoading(false)
        setRefreshing(false)
    }, [])

    useEffect(() => { load() }, [load])

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">Audience Segments</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            {totalUsers > 0 && <span className="text-xs text-slate-400">{fmtNum(totalUsers)} total users</span>}
                            {lastAnalysed && <span className="text-xs text-slate-300">· Last analysed {fmtDate(lastAnalysed)}</span>}
                            {cached && <span className="text-[10px] rounded-full bg-amber-50 text-amber-600 px-1.5 py-0.5 font-medium">Cached</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => load(true)} disabled={refreshing}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
                            <ArrowRepeat size={13} className={refreshing ? 'animate-spin' : ''} />
                            {refreshing ? 'Analysing...' : 'Re-analyse'}
                        </button>
                    </div>
                </div>
                {loading ? (
                    <p className="px-5 py-8 text-center text-sm text-slate-400">Loading segments...</p>
                ) : !segments.length ? (
                    <div className="px-5 py-8 text-center space-y-2">
                        <p className="text-sm text-slate-400">No segments yet.</p>
                        <button onClick={() => load(true)} className="text-xs text-black underline hover:no-underline">Run first analysis</button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {segments.map(s => (
                            <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800">{s.name}</p>
                                    <p className="text-xs text-slate-400 truncate">{s.description}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                        <PeopleFill size={11} /> {fmtNum(s.userCount)}
                                    </span>
                                    {s.userCount > 0 && onCompose && (
                                        <button onClick={() => onCompose(s)}
                                            className="inline-flex items-center gap-1 rounded-lg bg-black px-2.5 py-1 text-[11px] font-medium text-white hover:bg-black/80 transition">
                                            <SendFill size={10} /> Compose
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Server Settings Tab ──────────────────────────────────────────────────────
function ServerTab() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [envStatus, setEnvStatus] = useState(null)
    const [form, setForm] = useState({
        useCustomServer: false,
        primaryApiKey: '',
        secondaryApiKey: '',
        secondaryDomain: 'truvgo.me',
        senderEmail: 'hello@tekpik.in',
        fromName: 'TEKPIK',
    })

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/mail/settings')
            const data = await res.json()
            if (data.settings) setForm(p => ({ ...p, ...data.settings }))
            if (data.envStatus) setEnvStatus(data.envStatus)
        } catch { /* ignore */ }
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const handleSave = async () => {
        setSaving(true)
        const tid = toast.loading('Saving server settings...')
        try {
            const res = await fetch('/api/admin/mail/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed')
            toast.success('Server settings saved', { id: tid })
            if (data.settings) setForm(p => ({ ...p, ...data.settings }))
        } catch (err) {
            toast.error(err.message, { id: tid })
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <p className="py-8 text-center text-sm text-slate-400">Loading settings...</p>

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-3xl">
            <div className="mb-6 border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Custom Mail Server</h2>
                    <p className="mt-1 text-sm text-slate-500">Override the default environment variables and use custom API keys for email sending.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={form.useCustomServer} onChange={e => set('useCustomServer', e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                </label>
            </div>

            <div className={`space-y-5 ${!form.useCustomServer ? 'opacity-70' : ''}`}>
                <div className="grid grid-cols-2 gap-4">
                    <label className="block space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Sender Name</span>
                        <input value={!form.useCustomServer ? 'TEKPIK' : form.fromName} 
                            onChange={e => set('fromName', e.target.value)}
                            disabled={!form.useCustomServer}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500" />
                    </label>
                    <label className="block space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Sender Email</span>
                        <input value={!form.useCustomServer ? envStatus?.senderEmail : form.senderEmail} 
                            onChange={e => set('senderEmail', e.target.value)}
                            disabled={!form.useCustomServer}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500" />
                    </label>
                </div>

                <div className="pt-2 border-t border-slate-100">
                    <h3 className="text-sm font-medium text-slate-900 mb-4">Primary Provider (Resend)</h3>
                    <label className="block space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Resend API Key</span>
                        <input value={!form.useCustomServer ? envStatus?.primaryApiKey : form.primaryApiKey} 
                            onChange={e => set('primaryApiKey', e.target.value)}
                            disabled={!form.useCustomServer}
                            type={!form.useCustomServer ? "text" : "password"} placeholder="re_..."
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 font-mono disabled:bg-slate-50 disabled:text-slate-500" />
                    </label>
                </div>

                <div className="pt-2 border-t border-slate-100">
                    <h3 className="text-sm font-medium text-slate-900 mb-4">Secondary Provider (Failover)</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <label className="block space-y-1.5 col-span-2">
                            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Failover API Key</span>
                            <input value={!form.useCustomServer ? envStatus?.secondaryApiKey : form.secondaryApiKey} 
                                onChange={e => set('secondaryApiKey', e.target.value)}
                                disabled={!form.useCustomServer}
                                type={!form.useCustomServer ? "text" : "password"} placeholder="re_..."
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 font-mono disabled:bg-slate-50 disabled:text-slate-500" />
                        </label>
                        <label className="block space-y-1.5 col-span-2">
                            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Failover Domain</span>
                            <input value={!form.useCustomServer ? envStatus?.secondaryDomain : form.secondaryDomain} 
                                onChange={e => set('secondaryDomain', e.target.value)}
                                disabled={!form.useCustomServer}
                                placeholder="truvgo.me"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500" />
                        </label>
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <button onClick={handleSave} disabled={saving || !form.useCustomServer}
                        className="inline-flex items-center gap-2 rounded-xl bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60 transition">
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Logs Tab ─────────────────────────────────────────────────────────────────
function LogsTab() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/mail')
            const data = await res.json()
            setLogs(data.logs || [])
        } catch { /* ignore */ }
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ClockHistory size={15} className="text-slate-500" />
                    <h2 className="text-base font-semibold text-slate-900">Delivery Logs</h2>
                </div>
                <button onClick={load} className="text-slate-400 hover:text-slate-600 transition"><ArrowRepeat size={15} /></button>
            </div>
            {loading ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">Loading logs...</p>
            ) : !logs.length ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">No emails sent yet.</p>
            ) : (
                <div className="divide-y divide-slate-100">
                    {logs.map(log => (
                        <div key={log.id} className="px-5 py-3 flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${log.type === 'broadcast' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                        {log.type === 'broadcast' ? <PeopleFill size={10} /> : <EnvelopeFill size={10} />}
                                        {log.type === 'broadcast' ? 'Broadcast' : 'Single'}
                                    </span>
                                    <p className="text-sm font-medium text-slate-800 truncate">{log.subject}</p>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {log.type === 'broadcast'
                                        ? `Sent to ${fmtNum(log.recipientCount)} recipients`
                                        : `Sent to ${log.to}`}
                                    {' · '}by {log.sentByEmail || 'admin'}
                                </p>
                            </div>
                            <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{fmtDate(log.createdAt)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
