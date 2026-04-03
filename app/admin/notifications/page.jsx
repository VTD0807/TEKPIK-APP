'use client'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

export default function NotificationsPage() {
    const [users, setUsers] = useState([])
    const [products, setProducts] = useState([])
    const [campaigns, setCampaigns] = useState([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [form, setForm] = useState({
        title: '',
        message: '',
        link: '',
        targetType: 'all',
        role: 'USER',
        userId: '',
        attachedProductId: '',
    })

    const load = async () => {
        try {
            const [usersRes, campaignsRes, productsRes] = await Promise.all([
                fetch('/api/admin/users', { cache: 'no-store' }),
                fetch('/api/admin/notifications', { cache: 'no-store' }),
                fetch('/api/admin/products', { cache: 'no-store' }),
            ])

            const usersData = await usersRes.json()
            const campaignsData = await campaignsRes.json()
            const productsData = await productsRes.json()

            setUsers(Array.isArray(usersData?.users) ? usersData.users : [])
            setCampaigns(Array.isArray(campaignsData?.campaigns) ? campaignsData.campaigns : [])
            setProducts(Array.isArray(productsData?.products) ? productsData.products : [])
        } catch {
            toast.error('Failed to load notification data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const estimatedRecipients = useMemo(() => {
        if (form.targetType === 'all') return users.length
        if (form.targetType === 'role') return users.filter(u => (u.role || 'USER') === form.role).length
        return form.userId ? 1 : 0
    }, [form.targetType, form.role, form.userId, users])

    const submit = async (e) => {
        e.preventDefault()
        if (!form.title.trim() || !form.message.trim()) {
            toast.error('Title and message are required')
            return
        }

        setSending(true)
        try {
            const res = await fetch('/api/admin/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data?.error || 'Failed to send')

            toast.success(`Notification sent to ${data.sentCount || 0} users`)
            setForm(prev => ({ ...prev, title: '', message: '', link: '', userId: '', attachedProductId: '' }))
            await load()
        } catch (err) {
            toast.error(err.message)
        } finally {
            setSending(false)
        }
    }

    if (loading) {
        return <div className="py-12 text-sm text-slate-400">Loading notifications module...</div>
    }

    return (
        <div className="space-y-8 pb-16">
            <div>
                <h1 className="text-2xl text-slate-500">Notify <span className="text-slate-800 font-medium">Users</span></h1>
                <p className="text-sm text-slate-400 mt-1">Create in-app notifications and target all users, a role, or one user.</p>
            </div>

            <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Title</label>
                        <input
                            value={form.title}
                            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                            placeholder="Service update"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Link (optional)</label>
                        <input
                            value={form.link}
                            onChange={(e) => setForm(prev => ({ ...prev, link: e.target.value }))}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                            placeholder="/shop"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Message</label>
                    <textarea
                        value={form.message}
                        onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                        rows={4}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        placeholder="Your message to users"
                    />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Target Type</label>
                        <select
                            value={form.targetType}
                            onChange={(e) => setForm(prev => ({ ...prev, targetType: e.target.value }))}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        >
                            <option value="all">All Users</option>
                            <option value="role">By Role</option>
                            <option value="user">Single User</option>
                        </select>
                    </div>

                    {form.targetType === 'role' && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">Role</label>
                            <select
                                value={form.role}
                                onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                            >
                                <option value="USER">USER</option>
                                <option value="ADMIN">ADMIN</option>
                            </select>
                        </div>
                    )}

                    {form.targetType === 'user' && (
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-medium text-slate-500">User</label>
                            <select
                                value={form.userId}
                                onChange={(e) => setForm(prev => ({ ...prev, userId: e.target.value }))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                            >
                                <option value="">Select user</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>{u.name || 'User'} ({u.email || u.id})</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Attach Product (optional)</label>
                    <select
                        value={form.attachedProductId}
                        onChange={(e) => setForm(prev => ({ ...prev, attachedProductId: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    >
                        <option value="">No product attached</option>
                        {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.title || 'Untitled'} ({p.id})</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">Estimated recipients: {estimatedRecipients}</p>
                    <button
                        type="submit"
                        disabled={sending}
                        className="px-4 py-2 rounded-lg bg-black text-white text-sm hover:bg-black/90 disabled:opacity-60"
                    >
                        {sending ? 'Sending...' : 'Send Notification'}
                    </button>
                </div>
            </form>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-medium text-slate-700">Recent Campaigns</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="px-3 py-2">Title</th>
                                <th className="px-3 py-2">Attached Product</th>
                                <th className="px-3 py-2">Target</th>
                                <th className="px-3 py-2 text-right">Sent</th>
                                <th className="px-3 py-2">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.length > 0 ? campaigns.map((item) => (
                                <tr key={item.id} className="border-t border-slate-100">
                                    <td className="px-3 py-2">
                                        <p className="font-medium text-slate-700">{item.title}</p>
                                        <p className="text-xs text-slate-400 truncate max-w-[280px]">{item.message}</p>
                                    </td>
                                    <td className="px-3 py-2">
                                        {item.attachedProduct ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                                                    {item.attachedProduct.imageUrl
                                                        ? <img src={item.attachedProduct.imageUrl} alt={item.attachedProduct.title || 'Product'} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                                        : <span className="text-[9px] text-slate-400">No img</span>
                                                    }
                                                </div>
                                                <span className="text-xs text-slate-600 truncate max-w-[180px]">{item.attachedProduct.title}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-slate-600">{item.targetType}{item.role ? `:${item.role}` : ''}</td>
                                    <td className="px-3 py-2 text-right font-medium text-slate-800">{item.sentCount || 0}</td>
                                    <td className="px-3 py-2 text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center text-slate-400">No notification campaigns sent yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}