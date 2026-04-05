'use client'
import { useMemo, useState, useEffect } from 'react'
import { ArrowRepeat } from 'react-bootstrap-icons'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { usePathname } from 'next/navigation'

export default function AdminUsers() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [deletingId, setDeletingId] = useState(null)
    const [updatingRoleId, setUpdatingRoleId] = useState(null)
    const [search, setSearch] = useState('')
    const pathname = usePathname()
    const isEmployeePanel = pathname?.startsWith('/e')

    const loadUsers = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/admin/users', { cache: 'no-store' })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(data?.error || 'Failed to load users')
            }
            setUsers(data?.users || data || [])
        } catch (err) {
            setUsers([])
            setError(err?.message || 'Failed to load users')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadUsers()
    }, [])

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return users
        return users.filter(user => {
            const haystack = [
                user.name,
                user.email,
                user.role,
            ]
                .join(' ')
                .toLowerCase()
            return haystack.includes(q)
        })
    }, [users, search])

    const toggleRole = async (user) => {
        const targetId = user.id
        const nextRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
        setUpdatingRoleId(targetId)
        try {
            const res = await fetch(`/api/admin/users/${targetId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: nextRole })
            })

            const payload = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(payload?.error || 'Failed to update user')
            }

            setUsers(prev => prev.map(user => {
                if (user.id !== targetId) return user
                return {
                    ...user,
                    role: nextRole,
                }
            }))
            toast.success('Role updated')
        } catch (error) {
            toast.error(error.message || 'Failed to update user')
        } finally {
            setUpdatingRoleId(null)
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
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl text-slate-500">Manage <span className="text-slate-800 font-medium">Users</span></h1>
                    <p className="text-sm text-slate-400 mt-1">Basic user operations are separated from employee-access assignment.</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, email, role"
                        className="w-full sm:w-80 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-slate-400"
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div className="text-xs text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>{filteredUsers.length} users</span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadUsers}
                            className="normal-case text-slate-600 hover:text-slate-900"
                            type="button"
                        >
                            Refresh
                        </button>
                        {!isEmployeePanel && <Link href="/admin/employees/access" className="normal-case text-indigo-600 hover:underline">Go to Employee Access</Link>}
                    </div>
                </div>

                {error && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 break-words">
                        {error}
                    </div>
                )}

                <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
                    <table className="w-full text-left text-sm">
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
                            {filteredUsers.length > 0 ? filteredUsers.map(u => (
                                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                                    <td className="px-4 py-3 font-medium text-slate-700">{u.name || 'Unknown'}</td>
                                    <td className="px-4 py-3 text-slate-500 break-all">{u.email || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'ADMIN' ? 'bg-slate-100 text-slate-900' : 'bg-slate-100 text-slate-500'}`}>
                                            {u.role || 'USER'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-400">{(u.createdAt || u.created_at) ? new Date(u.createdAt || u.created_at).toLocaleDateString() : '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {!isEmployeePanel && (
                                                <Link href={`/admin/profile/${u.id}`} className="text-xs px-3 py-1 bg-slate-100 text-slate-900 hover:bg-slate-200 rounded-lg transition font-medium">
                                                    View Profile
                                                </Link>
                                            )}
                                            <button
                                                onClick={() => toggleRole(u)}
                                                disabled={updatingRoleId === u.id}
                                                className="text-xs px-3 py-1 border border-slate-200 hover:bg-slate-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {updatingRoleId === u.id ? 'Updating...' : `Make ${u.role === 'ADMIN' ? 'USER' : 'ADMIN'}`}
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
                            )) : (
                                <tr><td colSpan="5" className="px-4 py-10 text-center text-slate-400">No users found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
