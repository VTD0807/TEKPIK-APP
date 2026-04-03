'use client'
import { useState, useEffect } from 'react'
import { ArrowRepeat } from 'react-bootstrap-icons'
import toast from 'react-hot-toast'

export default function AdminUsers() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState(null)
    const [updatingCmsId, setUpdatingCmsId] = useState(null)

    useEffect(() => {
        // Fetch real users from DB
        fetch('/api/admin/users')
            .then(r => r.json())
            .then(data => {
                setUsers(data?.users || data || [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    const toggleRole = async (id) => {
        const user = users.find(u => u.id === id)
        const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
        
        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole })
        })

        if (res.ok) {
            setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u))
            toast.success('Role updated')
        } else {
            toast.error('Failed to update role')
        }
    }

    const toggleCmsAccess = async (user) => {
        const current = Boolean(user?.dashboardAccess?.cms)
        const next = !current
        setUpdatingCmsId(user.id)

        try {
            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dashboardAccess: { cms: next } })
            })

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}))
                throw new Error(payload?.error || 'Failed to update CMS access')
            }

            setUsers(prev => prev.map(u => {
                if (u.id !== user.id) return u
                return {
                    ...u,
                    dashboardAccess: {
                        ...(u.dashboardAccess || {}),
                        cms: next,
                    }
                }
            }))
            toast.success(next ? 'CMS access granted' : 'CMS access revoked')
        } catch (error) {
            toast.error(error.message || 'Failed to update CMS access')
        } finally {
            setUpdatingCmsId(null)
        }
    }

    const deleteUser = async (user) => {
        const ok = window.confirm(`Delete ${user.name || user.email || 'this user'}? This will remove the account and related analytics data.`)
        if (!ok) return

        setDeletingId(user.id)
        try {
            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}))
                throw new Error(payload?.error || 'Failed to delete user')
            }

            setUsers(prev => prev.filter(u => u.id !== user.id))
            toast.success('User deleted')
        } catch (error) {
            toast.error(error.message || 'Failed to delete user')
        } finally {
            setDeletingId(null)
        }
    }

    if (loading) return <div className="flex justify-center py-20"><ArrowRepeat className="animate-spin text-slate-900" /></div>

    return (
        <div className="text-slate-500 mb-28 space-y-5">
            <h1 className="text-2xl text-slate-500">Manage <span className="text-slate-800 font-medium">Users</span></h1>

            <div className="overflow-x-auto">
                <table className="w-full text-left ring ring-slate-200 rounded overflow-hidden text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Joined</th>
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length > 0 ? (
                            users.map(u => (
                                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-700">{u.name}</td>
                                    <td className="px-4 py-3 text-slate-400">{u.email}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'ADMIN' ? 'bg-slate-100 text-slate-900' : 'bg-slate-100 text-slate-500'}`}>
                                            {u.role}
                                        </span>
                                        {u.dashboardAccess?.cms && (
                                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                CMS
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400">{(u.createdAt || u.created_at) ? new Date(u.createdAt || u.created_at).toLocaleDateString() : '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <a href={`/admin/profile/${u.id}`} className="text-xs px-3 py-1 bg-slate-100 text-slate-900 hover:bg-slate-100 rounded-lg transition font-medium">
                                                View Profile
                                            </a>
                                            <button onClick={() => toggleRole(u.id)} className="text-xs px-3 py-1 border border-slate-200 hover:bg-slate-50 rounded-lg transition">
                                                Make {u.role === 'ADMIN' ? 'USER' : 'ADMIN'}
                                            </button>
                                            <button
                                                onClick={() => toggleCmsAccess(u)}
                                                disabled={updatingCmsId === u.id}
                                                className="text-xs px-3 py-1 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {updatingCmsId === u.id ? 'Updating...' : (u.dashboardAccess?.cms ? 'Revoke CMS' : 'Grant CMS')}
                                            </button>
                                            <button
                                                onClick={() => deleteUser(u)}
                                                disabled={deletingId === u.id}
                                                className="text-xs px-3 py-1 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {deletingId === u.id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="5" className="px-4 py-10 text-center text-slate-400">No users found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
