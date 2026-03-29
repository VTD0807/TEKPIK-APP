'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

const dummyUsers = [
    { id: 'user_1', name: 'Admin User', email: 'admin@tekpik.com', role: 'ADMIN', createdAt: '2025-08-01' },
    { id: 'user_2', name: 'Jane Smith', email: 'jane@example.com', role: 'USER', createdAt: '2025-08-10' },
    { id: 'user_3', name: 'John Doe', email: 'john@example.com', role: 'USER', createdAt: '2025-08-15' },
]

export default function AdminUsers() {
    const [users, setUsers] = useState(dummyUsers)

    const toggleRole = (id) => {
        setUsers(prev => prev.map(u => u.id === id
            ? { ...u, role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' }
            : u
        ))
        toast.success('Role updated')
        // TODO: PATCH /api/admin/users/[id]
    }

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
                        {users.map(u => (
                            <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-700">{u.name}</td>
                                <td className="px-4 py-3 text-slate-400">{u.email}</td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-slate-400">{u.createdAt}</td>
                                <td className="px-4 py-3">
                                    <button onClick={() => toggleRole(u.id)} className="text-xs px-3 py-1 border border-slate-200 hover:bg-slate-50 rounded-lg transition">
                                        Make {u.role === 'ADMIN' ? 'USER' : 'ADMIN'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
