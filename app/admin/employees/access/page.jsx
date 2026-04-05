'use client'
import { useMemo, useState, useEffect } from 'react'
import { ArrowRepeat } from 'react-bootstrap-icons'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth-context'

const ROLE_OPTIONS = ['MANAGER', 'EDITOR', 'SUPPORT', 'EMPLOYEE']

const DASHBOARD_ACCESS_OPTIONS = [
    { key: 'admin', label: 'Admin dashboard' },
    { key: 'cms', label: 'CMS' },
    { key: 'store', label: 'Store dashboard' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'employees', label: 'Employee analytics' },
    { key: 'users', label: 'User management' },
    { key: 'products', label: 'Product management' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'settings', label: 'Settings' },
]

const EMPLOYEE_ROLES = new Set(['MANAGER', 'EDITOR', 'SUPPORT', 'EMPLOYEE'])
const PAGE_SIZE = 5

export default function EmployeeAccessPage() {
    const { user } = useAuth()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [savingId, setSavingId] = useState(null)
    const [addingId, setAddingId] = useState(null)
    const [revokingId, setRevokingId] = useState(null)
    const [selectedUserId, setSelectedUserId] = useState(null)
    const [search, setSearch] = useState('')
    const [addSearch, setAddSearch] = useState('')
    const [activeTab, setActiveTab] = useState('users')
    const [usersPage, setUsersPage] = useState(1)
    const [employeesPage, setEmployeesPage] = useState(1)
    const [revokeCandidate, setRevokeCandidate] = useState(null)
    const [form, setForm] = useState(createEmptyForm())

    const employeeUsers = useMemo(
        () => users.filter(isEmployeeScopedUser),
        [users]
    )

    const authedFetch = async (url, options = {}) => {
        if (!user) throw new Error('Authentication required')
        const token = await user.getIdToken()
        const incomingHeaders = options.headers || {}
        const headers = {
            ...incomingHeaders,
            Authorization: `Bearer ${token}`,
        }
        return fetch(url, { ...options, headers })
    }

    const reloadUsers = async (preferredUserId = null) => {
        const res = await authedFetch('/api/admin/users', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            throw new Error(data?.error || 'Failed to load users')
        }

        const allUsers = data?.users || data || []
        setUsers(allUsers)

        const preferred = preferredUserId ? allUsers.find((u) => u.id === preferredUserId) : null
        const firstEmployee = allUsers.find(isEmployeeScopedUser) || null
        const nextUser = preferred || firstEmployee || null

        setSelectedUserId(nextUser?.id || null)
        setForm(nextUser ? createFormFromUser(nextUser) : createEmptyForm())
    }

    useEffect(() => {
        if (!user) return
        reloadUsers()
            .catch(() => toast.error('Failed to load users'))
            .finally(() => setLoading(false))
    }, [user])

    const selectedUser = useMemo(
        () => users.find(user => user.id === selectedUserId) || null,
        [users, selectedUserId]
    )

    const addableUsers = useMemo(() => {
        const q = addSearch.trim().toLowerCase()
        const candidates = users.filter((user) => {
            const role = String(user?.role || 'USER').toUpperCase()
            if (role === 'ADMIN') return false
            if (isEmployeeScopedUser(user)) return false
            return true
        })

        if (!q) return candidates
        return candidates.filter((user) => {
            const haystack = [user.name, user.email, user.role]
                .join(' ')
                .toLowerCase()
            return haystack.includes(q)
        })
    }, [users, addSearch])

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return employeeUsers
        return employeeUsers.filter(user => {
            const haystack = [
                user.name,
                user.email,
                user.role,
                ...(normalizeList(user.tags || user.employeeTags)),
                ...(normalizeList(user.sectors)),
            ]
                .join(' ')
                .toLowerCase()
            return haystack.includes(q)
        })
    }, [employeeUsers, search])

    useEffect(() => {
        if (!selectedUserId && employeeUsers.length > 0) {
            const firstUser = employeeUsers[0]
            setSelectedUserId(firstUser.id)
            setForm(createFormFromUser(firstUser))
            return
        }

        if (selectedUserId && !employeeUsers.some(user => user.id === selectedUserId)) {
            const nextUser = employeeUsers[0] || null
            setSelectedUserId(nextUser?.id || null)
            setForm(nextUser ? createFormFromUser(nextUser) : createEmptyForm())
        }
    }, [employeeUsers, selectedUserId])

    useEffect(() => {
        setUsersPage(1)
    }, [addSearch, users])

    useEffect(() => {
        setEmployeesPage(1)
    }, [search, employeeUsers])

    const openUser = (user) => {
        setSelectedUserId(user.id)
        setForm(createFormFromUser(user))
    }

    const updateAccessAll = (value) => {
        setForm(prev => {
            const nextAccess = {}
            for (const option of DASHBOARD_ACCESS_OPTIONS) {
                nextAccess[option.key] = value
            }
            return { ...prev, dashboardAccess: nextAccess }
        })
    }

    const saveUser = async () => {
        if (!selectedUser) return

        setSavingId(selectedUser.id)
        try {
            const res = await authedFetch(`/api/admin/users/${selectedUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: form.role,
                    tags: form.tags,
                    sectors: form.sectors,
                    dashboardAccess: form.dashboardAccess,
                    employeeAccess: true,
                })
            })

            const payload = await res.json().catch(() => ({}))
            if (!res.ok || payload?.success === false) {
                throw new Error(payload?.error || 'Failed to update user')
            }

            await reloadUsers(selectedUser.id)
            toast.success('Employee access updated')
        } catch (error) {
            toast.error(error.message || 'Failed to update user')
        } finally {
            setSavingId(null)
        }
    }

    const addEmployee = async (user) => {
        setAddingId(user.id)
        try {
            const addPayload = {
                role: 'EMPLOYEE',
                tags: user.tags || user.employeeTags || [],
                sectors: user.sectors || [],
                dashboardAccess: user.dashboardAccess || {},
                employeeAccess: true,
            }

            const res = await authedFetch(`/api/admin/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addPayload)
            })

            const payload = await res.json().catch(() => ({}))
            if (!res.ok || payload?.success === false) {
                throw new Error(payload?.error || 'Failed to add employee')
            }

            // Verify persisted state after write; retry once through the collection PATCH route if needed.
            const verifyRes = await authedFetch('/api/admin/users', { cache: 'no-store' })
            const verifyData = await verifyRes.json().catch(() => ({}))
            const verifiedUsers = verifyData?.users || verifyData || []
            const persisted = verifiedUsers.find((item) => item.id === user.id)

            if (!persisted || !isEmployeeScopedUser(persisted)) {
                const retryRes = await authedFetch('/api/admin/users', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, ...addPayload }),
                })
                const retryPayload = await retryRes.json().catch(() => ({}))
                if (!retryRes.ok || retryPayload?.success === false) {
                    throw new Error(retryPayload?.error || 'Employee add verification failed')
                }
            }

            await reloadUsers(user.id)
            // Safety net: ensure immediate visibility even if backend value lags in response.
            setUsers((prev) => prev.map((item) => {
                if (item.id !== user.id) return item
                return {
                    ...item,
                    role: 'EMPLOYEE',
                    employeeAccess: true,
                }
            }))
            setActiveTab('employees')
            setEmployeesPage(1)
            toast.success('User added to employee list')
        } catch (error) {
            toast.error(error.message || 'Failed to add employee')
        } finally {
            setAddingId(null)
        }
    }

    const revokeEmployeeAccess = async (targetUser) => {
        if (!targetUser?.id) return

        setRevokingId(targetUser.id)
        try {
            const res = await authedFetch(`/api/admin/users/${targetUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: 'USER',
                    tags: [],
                    sectors: [],
                    dashboardAccess: {},
                    employeeAccess: false,
                })
            })

            const payload = await res.json().catch(() => ({}))
            if (!res.ok || payload?.success === false) {
                throw new Error(payload?.error || 'Failed to revoke employee access')
            }

            await reloadUsers()
            setActiveTab('users')
            setUsersPage(1)
            toast.success('Employee access revoked')
        } catch (error) {
            toast.error(error.message || 'Failed to revoke access')
        } finally {
            setRevokingId(null)
            setRevokeCandidate(null)
        }
    }

    if (loading) return <div className="flex justify-center py-20"><ArrowRepeat className="animate-spin text-slate-900" /></div>

    const selectedAccessCount = DASHBOARD_ACCESS_OPTIONS.filter(option => Boolean(form.dashboardAccess?.[option.key])).length
    const totalUsersPages = Math.max(1, Math.ceil(addableUsers.length / PAGE_SIZE))
    const totalEmployeesPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
    const pagedAddableUsers = addableUsers.slice((usersPage - 1) * PAGE_SIZE, usersPage * PAGE_SIZE)
    const pagedEmployees = filteredUsers.slice((employeesPage - 1) * PAGE_SIZE, employeesPage * PAGE_SIZE)

    return (
        <div className="text-slate-500 mb-28 space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl text-slate-500">Employee <span className="text-slate-800 font-medium">Access</span></h1>
                    <p className="text-sm text-slate-400 mt-1">Assign role, tags, sectors, and dashboard access in a dedicated module.</p>
                    <p className="text-xs text-slate-400 mt-2">Admins are excluded here and always keep full access.</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, email, tag, sector"
                        className="w-full sm:w-80 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-slate-400"
                    />
                </div>
            </div>

            <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)] gap-5 items-start">
                <div className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-3">
                        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setActiveTab('users')}
                                className={`px-3 py-1.5 text-xs font-medium transition ${activeTab === 'users' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                            >
                                Users ({addableUsers.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('employees')}
                                className={`px-3 py-1.5 text-xs font-medium transition border-l border-slate-200 ${activeTab === 'employees' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                            >
                                Employees ({filteredUsers.length})
                            </button>
                        </div>

                        {activeTab === 'users' && (
                            <>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wider">Add Employee</p>
                                <p className="text-sm text-slate-500">Search non-admin users and add them to the employee list.</p>
                            </div>
                            <input
                                value={addSearch}
                                onChange={(e) => setAddSearch(e.target.value)}
                                placeholder="Search users to add"
                                className="w-full sm:w-64 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-slate-400"
                            />
                        </div>

                        {addableUsers.length > 0 ? (
                            <div className="max-h-56 overflow-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
                                {pagedAddableUsers.map((user) => (
                                    <div key={user.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{user.name || 'Unknown'}</p>
                                            <p className="text-xs text-slate-400 truncate">{user.email || '—'}</p>
                                        </div>
                                        <button
                                            onClick={() => addEmployee(user)}
                                            disabled={addingId === user.id}
                                            className="text-xs px-3 py-1 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {addingId === user.id ? 'Adding...' : 'Add'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-slate-400 px-2 py-1">No eligible users to add.</div>
                        )}

                        <Pagination
                            page={usersPage}
                            totalPages={totalUsersPages}
                            onPrev={() => setUsersPage((p) => Math.max(1, p - 1))}
                            onNext={() => setUsersPage((p) => Math.min(totalUsersPages, p + 1))}
                        />
                            </>
                        )}

                        {activeTab === 'employees' && (
                            <>
                                <div className="text-xs text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                    <span>{filteredUsers.length} employees</span>
                                    <span>{users.length} total users</span>
                                </div>

                                <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
                                    <table className="w-full min-w-[900px] text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-600">
                                            <tr>
                                                <th className="px-4 py-3">Name</th>
                                                <th className="px-4 py-3 w-28">Role</th>
                                                <th className="px-4 py-3 w-44">Tags / Sectors</th>
                                                <th className="px-4 py-3 w-32">Access</th>
                                                <th className="px-4 py-3 w-32">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pagedEmployees.length > 0 ? pagedEmployees.map(u => {
                                                const tags = normalizeList(u.tags || u.employeeTags)
                                                const sectors = normalizeList(u.sectors)
                                                const accessCount = Object.values(u.dashboardAccess || {}).filter(Boolean).length
                                                const isSelected = u.id === selectedUserId
                                                return (
                                                    <tr
                                                        key={u.id}
                                                        onClick={() => openUser(u)}
                                                        className={`border-t border-slate-100 cursor-pointer transition ${isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}
                                                    >
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-slate-700">{u.name}</div>
                                                            <div className="text-xs text-slate-400 break-all">{u.email}</div>
                                                            <div className="text-[11px] text-slate-400 mt-1">{(u.createdAt || u.created_at) ? new Date(u.createdAt || u.created_at).toLocaleDateString() : '—'}</div>
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'ADMIN' ? 'bg-slate-100 text-slate-900' : 'bg-slate-100 text-slate-500'}`}>
                                                                {u.role || 'USER'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {tags.slice(0, 3).map(tag => (
                                                                    <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{tag}</span>
                                                                ))}
                                                                {tags.length === 0 && <span className="text-xs text-slate-300">No tags</span>}
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                                {sectors.slice(0, 2).map(sector => (
                                                                    <span key={sector} className="text-[11px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">{sector}</span>
                                                                ))}
                                                                {sectors.length === 0 && <span className="text-xs text-slate-300">No sectors</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <span className="inline-flex items-center whitespace-nowrap text-xs leading-none px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                {accessCount} sections
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    openUser(u)
                                                                }}
                                                                className="text-xs whitespace-nowrap px-3 py-1 border border-slate-200 hover:bg-slate-50 rounded-lg transition"
                                                            >
                                                                Assign
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            }) : (
                                                <tr><td colSpan="5" className="px-4 py-10 text-center text-slate-400">No employee accounts found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <Pagination
                                    page={employeesPage}
                                    totalPages={totalEmployeesPages}
                                    onPrev={() => setEmployeesPage((p) => Math.max(1, p - 1))}
                                    onNext={() => setEmployeesPage((p) => Math.min(totalEmployeesPages, p + 1))}
                                />
                            </>
                        )}
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4 sticky top-4">
                    <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Employee Assignment</p>
                        <h2 className="text-lg font-semibold text-slate-800 mt-1">
                            {selectedUser ? selectedUser.name : 'Select a user'}
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">Control role, tags, sectors, and dashboard access.</p>
                    </div>

                    {selectedUser ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-slate-500">Role</label>
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700"
                                >
                                    {ROLE_OPTIONS.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-slate-500">Employee Tags</label>
                                <textarea
                                    value={form.tags}
                                    onChange={(e) => setForm(prev => ({ ...prev, tags: e.target.value }))}
                                    placeholder="ops, lead, senior, storefront"
                                    className="w-full min-h-[84px] px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-slate-400"
                                />
                                <p className="text-[11px] text-slate-400">Comma-separated tags used for filtering and assignment.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-slate-500">Sectors</label>
                                <textarea
                                    value={form.sectors}
                                    onChange={(e) => setForm(prev => ({ ...prev, sectors: e.target.value }))}
                                    placeholder="electronics, fashion, home, wellness"
                                    className="w-full min-h-[84px] px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-slate-400"
                                />
                                <p className="text-[11px] text-slate-400">Use sectors to map the employee to one or more business areas.</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500">Dashboard Access</label>
                                        <p className="text-[11px] text-slate-400">{selectedAccessCount} sections enabled</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => updateAccessAll(true)} className="text-[11px] px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600">All</button>
                                        <button type="button" onClick={() => updateAccessAll(false)} className="text-[11px] px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600">None</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-2 max-h-[280px] overflow-auto pr-1">
                                    {DASHBOARD_ACCESS_OPTIONS.map(option => (
                                        <label key={option.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                                            <span className="text-sm text-slate-700">{option.label}</span>
                                            <input
                                                type="checkbox"
                                                checked={Boolean(form.dashboardAccess?.[option.key])}
                                                onChange={(e) => setForm(prev => ({
                                                    ...prev,
                                                    dashboardAccess: {
                                                        ...prev.dashboardAccess,
                                                        [option.key]: e.target.checked,
                                                    }
                                                }))}
                                                className="h-4 w-4 rounded border-slate-300 text-slate-900"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    onClick={saveUser}
                                    disabled={savingId === selectedUser.id}
                                    className="flex-1 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {savingId === selectedUser.id ? 'Saving...' : 'Save Assignment'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRevokeCandidate(selectedUser)}
                                    disabled={revokingId === selectedUser.id || savingId === selectedUser.id}
                                    className="px-4 py-2 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {revokingId === selectedUser.id ? 'Revoking...' : 'Revoke'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm(createFormFromUser(selectedUser))}
                                    className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-400">
                            Choose a user from the list to edit their employee setup.
                        </div>
                    )}
                </div>
            </div>

            {revokeCandidate && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-5 space-y-4">
                        <h3 className="text-base font-semibold text-slate-800">Revoke Employee Access</h3>
                        <p className="text-sm text-slate-600">
                            Revoke employee access for <span className="font-medium text-slate-800">{revokeCandidate.name || revokeCandidate.email || 'this user'}</span>?
                        </p>
                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setRevokeCandidate(null)}
                                className="px-3 py-1.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => revokeEmployeeAccess(revokeCandidate)}
                                disabled={revokingId === revokeCandidate.id}
                                className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {revokingId === revokeCandidate.id ? 'Revoking...' : 'Revoke'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function isEmployeeScopedUser(user) {
    const role = String(user?.role || 'USER').trim().toUpperCase()
    if (role === 'ADMIN') return false
    if (EMPLOYEE_ROLES.has(role)) return true
    if (typeof user?.employeeAccess === 'boolean') return user.employeeAccess
    // Legacy fallback for old records before employeeAccess existed.
    return false
}

function createEmptyForm() {
    return {
        role: 'USER',
        tags: '',
        sectors: '',
        dashboardAccess: DASHBOARD_ACCESS_OPTIONS.reduce((acc, option) => {
            acc[option.key] = false
            return acc
        }, {}),
    }
}

function createFormFromUser(user) {
    const access = DASHBOARD_ACCESS_OPTIONS.reduce((acc, option) => {
        acc[option.key] = Boolean(user?.dashboardAccess?.[option.key])
        return acc
    }, {})

    return {
        role: user?.role || 'USER',
        tags: normalizeList(user?.tags || user?.employeeTags).join(', '),
        sectors: normalizeList(user?.sectors).join(', '),
        dashboardAccess: access,
    }
}

function normalizeList(value) {
    if (Array.isArray(value)) {
        return value.map(item => String(item).trim()).filter(Boolean)
    }
    if (typeof value === 'string') {
        return value.split(',').map(item => item.trim()).filter(Boolean)
    }
    return []
}

function Pagination({ page, totalPages, onPrev, onNext }) {
    if (totalPages <= 1) return null

    return (
        <div className="flex items-center justify-end gap-2 pt-2">
            <button
                type="button"
                onClick={onPrev}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Prev
            </button>
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
            <button
                type="button"
                onClick={onNext}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Next
            </button>
        </div>
    )
}
