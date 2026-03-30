'use client'
import { useState, useEffect } from 'react'
import { Loader2Icon } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminUsers() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)

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

    if (loading) return <div className="flex justify-center py-20"><Loader2Icon className="animate-spin text-indigo-500" /></div>

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
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-400">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => toggleRole(u.id)} className="text-xs px-3 py-1 border border-slate-200 hover:bg-slate-50 rounded-lg transition">
                                            Make {u.role === 'ADMIN' ? 'USER' : 'ADMIN'}
                                        </button>
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
