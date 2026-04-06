'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import Loading from '@/components/Loading'
import { useRouter } from 'next/navigation'

export default function AdminWorkAssignmentDetailsPage({ params }) {
    const resolvedParams = use(params)
    const assignmentId = resolvedParams?.id
    const { user } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [assignment, setAssignment] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            if (!user) {
                setLoading(false)
                return
            }
            if (!assignmentId) {
                setError('Invalid assignment id')
                setLoading(false)
                return
            }

            setLoading(true)
            setError('')
            try {
                const token = await user.getIdToken()
                const res = await fetch(`/api/admin/work-assignments/${assignmentId}`, {
                    cache: 'no-store',
                    headers: { Authorization: `Bearer ${token}` },
                })

                const payload = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(payload?.error || 'Failed to load assignment details')
                if (!cancelled) {
                    setAssignment(payload?.assignment || null)
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err?.message || 'Failed to load assignment details')
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [user, assignmentId])

    const details = assignment || {}
    const statusHistory = Array.isArray(details.statusHistory) ? details.statusHistory : []
    const checklist = Array.isArray(details.checklist) ? details.checklist : []
    const autoTracking = details.autoTracking || null

    const checklistDone = useMemo(() => checklist.filter((item) => item.done).length, [checklist])

    const deleteAssignment = async () => {
        if (!user || !assignmentId || deleting) return
        const confirmed = window.confirm('Delete this assignment permanently? This action cannot be undone.')
        if (!confirmed) return

        setDeleting(true)
        setError('')
        try {
            const token = await user.getIdToken()
            const res = await fetch(`/api/admin/work-assignments/${assignmentId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            const payload = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(payload?.error || 'Failed to delete assignment')
            router.push('/admin/work-assignments')
        } catch (err) {
            setError(err?.message || 'Failed to delete assignment')
        } finally {
            setDeleting(false)
        }
    }

    if (loading) return <Loading />

    if (error) {
        return (
            <div className="space-y-4">
                <Link href="/admin/work-assignments" className="text-sm text-slate-600 underline">Back to Assignments</Link>
                <div className="bg-white border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
            </div>
        )
    }

    if (!assignment) {
        return (
            <div className="space-y-4">
                <Link href="/admin/work-assignments" className="text-sm text-slate-600 underline">Back to Assignments</Link>
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-600">Assignment not found.</div>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-24">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <Link href="/admin/work-assignments" className="text-sm text-slate-500 underline">Back to Assignments</Link>
                    <h1 className="text-2xl text-slate-800 font-semibold mt-2">{details.title}</h1>
                    <p className="text-sm text-slate-500 mt-1">Full assignment details and timeline</p>
                </div>
                <div className="text-right text-xs text-slate-500 space-y-2">
                    <p>Status: {String(details.status || 'NOT_STARTED').replaceAll('_', ' ')}</p>
                    <p>Progress: {details.progressPercent || 0}%</p>
                    <p>Updated: {details.updatedAt ? new Date(details.updatedAt).toLocaleString() : '—'}</p>
                    <button
                        type="button"
                        onClick={deleteAssignment}
                        disabled={deleting}
                        className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100 disabled:opacity-60"
                    >
                        {deleting ? 'Deleting...' : 'Delete Assignment'}
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <h2 className="text-base font-semibold text-slate-800">Assignment Information</h2>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <Info label="Employee" value={details.employeeName || details.employeeEmail || details.employeeId} />
                        <Info label="Assigned By" value={details.assignedByName || details.assignedByEmail || details.assignedById} />
                        <Info label="Module" value={details.module || 'GENERAL'} />
                        <Info label="Type" value={String(details.workType || 'OTHER').replaceAll('_', ' ')} />
                        <Info label="Priority" value={details.priority || 'MEDIUM'} />
                        <Info label="Assignment Kind" value={String(details.assignmentKind || 'ONE_TIME').replaceAll('_', ' ')} />
                        <Info label="Complexity" value={String(details.complexity || 1)} />
                        <Info label="Estimated Hours" value={String(details.estimatedHours || 0)} />
                        <Info label="Due Date" value={details.dueDate ? new Date(details.dueDate).toLocaleDateString() : 'No due date'} />
                        <Info label="Created" value={details.createdAt ? new Date(details.createdAt).toLocaleString() : '—'} />
                        <Info label="Started" value={details.startedAt ? new Date(details.startedAt).toLocaleString() : 'Not started'} />
                        <Info label="Completed" value={details.completedAt ? new Date(details.completedAt).toLocaleString() : 'Not completed'} />
                    </div>

                    {details.description && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Description</p>
                            <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{details.description}</p>
                        </div>
                    )}

                    {details.notes && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Notes</p>
                            <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{details.notes}</p>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                        <h2 className="text-base font-semibold text-slate-800">Checklist</h2>
                        <p className="text-sm text-slate-500">Done: {checklistDone}/{checklist.length} ({details.checklistProgressPercent || 0}%)</p>
                        <div className="space-y-2 max-h-60 overflow-auto pr-1">
                            {checklist.length > 0 ? checklist.map((item) => (
                                <div key={item.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm flex items-center justify-between gap-2">
                                    <span className="text-slate-700">{item.title}</span>
                                    <span className={`text-xs ${item.done ? 'text-emerald-700' : 'text-slate-500'}`}>{item.done ? 'Done' : 'Pending'}</span>
                                </div>
                            )) : <p className="text-sm text-slate-400">No checklist items.</p>}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                        <h2 className="text-base font-semibold text-slate-800">Auto Tracking</h2>
                        {autoTracking?.enabled ? (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <Info label="Metric" value={String(autoTracking.metric || '').replaceAll('_', ' ')} />
                                <Info label="Target" value={String(autoTracking.targetValue || 0)} />
                                <Info label="Current" value={String(autoTracking.currentValue || 0)} />
                                <Info label="Absolute" value={String(autoTracking.currentAbsolute || 0)} />
                                <Info label="Progress" value={`${autoTracking.progressPercent || 0}%`} />
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">Auto tracking is not enabled for this assignment.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h2 className="text-base font-semibold text-slate-800">Status Timeline</h2>
                <div className="space-y-2 max-h-80 overflow-auto pr-1">
                    {statusHistory.length > 0 ? statusHistory.slice().reverse().map((item, index) => (
                        <div key={`${item.at || 'na'}-${index}`} className="rounded-lg border border-slate-200 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-medium text-slate-800">{String(item.status || 'NOT_STARTED').replaceAll('_', ' ')}</p>
                                <p className="text-xs text-slate-500">{item.at ? new Date(item.at).toLocaleString() : '—'}</p>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">By: {item.byName || item.byId || 'System'}</p>
                            {item.note && <p className="text-sm text-slate-700 mt-2">{item.note}</p>}
                            <p className="text-xs text-slate-500 mt-1">Progress: {item.progressPercent || 0}%</p>
                        </div>
                    )) : <p className="text-sm text-slate-400">No status history found.</p>}
                </div>
            </div>
        </div>
    )
}

function Info({ label, value }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-sm text-slate-800 mt-1 break-words">{value || '—'}</p>
        </div>
    )
}
