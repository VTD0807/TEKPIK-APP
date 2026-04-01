'use client'
import { useEffect, useState } from 'react'
import CMSDataTable from '@/components/cms/CMSDataTable'
import { People, Shield, Person } from 'react-bootstrap-icons'

export default function CMSUsers() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/admin/users')
            .then(r => r.json())
            .then(d => { setUsers(Array.isArray(d?.users) ? d.users : Array.isArray(d) ? d : []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    const columns = [
        {
            key: 'user',
            label: 'User',
            accessor: row => row.name,
            render: (row) => (
                <div className="flex items-center gap-3">
                    {row.image ? (
                        <img src={row.image} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100" referrerPolicy="no-referrer" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-100">
                            {(row.name || row.email || '?')[0]?.toUpperCase() || 'U'}
                        </div>
                    )}
                    <div>
                        <p className="text-slate-800 font-medium">{row.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-400">{row.email}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'role',
            label: 'Role',
            accessor: row => row.role,
            render: (row) => (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${row.role === 'ADMIN' ? 'bg-slate-100 text-slate-900 border border-slate-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                    {row.role === 'ADMIN' ? <Shield size={10} /> : <Person size={10} />}
                    {row.role}
                </span>
            ),
        },
        {
            key: 'joined',
            label: 'Joined',
            accessor: row => row.created_at || row.createdAt,
            render: (row) => (
                <span className="text-slate-500 text-xs font-medium">
                    {new Date(row.created_at || row.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
            ),
        },
    ]

    if (loading) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold text-slate-800">Users</h1>
                <div className="animate-pulse space-y-3">
                    {Array(5).fill(0).map((_, i) => <div key={i} className="h-14 bg-white rounded-xl border border-slate-200" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Users</h1>
                <p className="text-sm text-slate-500 mt-1">{users.length} registered users · {users.filter(u => u.role === 'ADMIN').length} admins</p>
            </div>

            {users.length > 0 ? (
                <CMSDataTable columns={columns} data={users} searchPlaceholder="Search users by name or email..." />
            ) : (
                <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                    <People size={40} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500">No users found.</p>
                </div>
            )}
        </div>
    )
}

