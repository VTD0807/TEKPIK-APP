'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import Loading from '@/components/Loading'
import { WORK_MODULE_OPTIONS, WORK_STATUS_OPTIONS } from '@/lib/work-assignments'

export default function EmployeeWorkPage() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [savingId, setSavingId] = useState('')
    const [assignments, setAssignments] = useState([])
    const [moduleFilter, setModuleFilter] = useState('ALL')
    const [message, setMessage] = useState('')

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            if (!user) {
                setLoading(false)
                return
            }

            setLoading(true)
            try {
                const token = await user.getIdToken()
                const res = await fetch('/api/me/work-assignments', {
                    cache: 'no-store',
                    headers: { Authorization: `Bearer ${token}` },
                })

                const payload = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(payload?.error || 'Failed to load work assignments')
                if (!cancelled) {
                    setAssignments(Array.isArray(payload?.assignments) ? payload.assignments : [])
                }
            } catch (error) {
                if (!cancelled) setMessage(error?.message || 'Failed to load work assignments')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [user])

    const summary = useMemo(() => {
        return assignments.reduce((acc, item) => {
            const status = item.status || 'NOT_STARTED'
            acc.total += 1
            acc[status] = (acc[status] || 0) + 1
            return acc
        }, { total: 0 })
    }, [assignments])

    const filteredAssignments = useMemo(() => {
        return assignments.filter((item) => {
            if (moduleFilter === 'ALL') return true
            return (item.module || 'GENERAL') === moduleFilter
        })
    }, [assignments, moduleFilter])

    const moduleSummary = useMemo(() => {
        return filteredAssignments.reduce((acc, item) => {
            const key = item.module || 'GENERAL'
            if (!acc[key]) acc[key] = { total: 0, pending: 0, completed: 0 }
            acc[key].total += 1
            if ((item.status || 'NOT_STARTED') === 'COMPLETED') acc[key].completed += 1
            else acc[key].pending += 1
            return acc
        }, {})
    }, [filteredAssignments])

    const updateProgress = async (assignmentId, currentStatus, currentProgress, nextStatus, nextProgress, note, checklist) => {
        if (!user) return

        const statusUnchanged = currentStatus === nextStatus
        const progressUnchanged = Number(currentProgress) === Number(nextProgress)
        const checklistChanged = Array.isArray(checklist)
        if (statusUnchanged && progressUnchanged && !note && !checklistChanged) return

        setSavingId(assignmentId)
        setMessage('')

        try {
            const token = await user.getIdToken()
            const res = await fetch(`/api/me/work-assignments/${assignmentId}/progress`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    status: nextStatus,
                    progressPercent: nextProgress,
                    note,
                    checklist,
                }),
            })

            const payload = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(payload?.error || 'Failed to update progress')

            if (payload?.assignment) {
                setAssignments((prev) => prev.map((item) => item.id === assignmentId ? payload.assignment : item))
            }
            setMessage('Progress updated successfully.')
        } catch (error) {
            setMessage(error?.message || 'Failed to update progress')
        } finally {
            setSavingId('')
        }
    }

    if (loading) return <Loading />

    return (
        <div className="space-y-6 pb-24">
            <div>
                <h1 className="text-2xl text-slate-500">My <span className="text-slate-800 font-medium">Work</span></h1>
                <p className="text-sm text-slate-400 mt-1">Track your assigned work and update status/progress.</p>
            </div>

            {message && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                    {message}
                </div>
            )}

            <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
                <Stat label="Total" value={summary.total || 0} />
                {WORK_STATUS_OPTIONS.map((item) => (
                    <Stat key={item} label={item.replaceAll('_', ' ')} value={summary[item] || 0} />
                ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-800">Module Wise Assignments</p>
                    <select
                        value={moduleFilter}
                        onChange={(e) => setModuleFilter(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="ALL">All Modules</option>
                        {WORK_MODULE_OPTIONS.map((item) => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>
                </div>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {Object.entries(moduleSummary).map(([moduleName, stats]) => (
                        <div key={moduleName} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                            <p className="text-xs uppercase tracking-wide text-slate-500">{moduleName}</p>
                            <p className="mt-1">Total: {stats.total} • Pending: {stats.pending} • Done: {stats.completed}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                {filteredAssignments.length > 0 ? filteredAssignments.map((item) => (
                    <WorkCard
                        key={item.id}
                        assignment={item}
                        saving={savingId === item.id}
                        onSave={updateProgress}
                    />
                )) : (
                    <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
                        No assigned work found for this module.
                    </div>
                )}
            </div>
        </div>
    )
}

function Stat({ label, value }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="text-xl font-semibold text-slate-800 mt-1">{value}</p>
        </div>
    )
}

function WorkCard({ assignment, saving, onSave }) {
    const [status, setStatus] = useState(assignment.status || 'NOT_STARTED')
    const [progress, setProgress] = useState(assignment.progressPercent || 0)
    const [checklist, setChecklist] = useState(Array.isArray(assignment.checklist) ? assignment.checklist : [])
    const [note, setNote] = useState('')

    useEffect(() => {
        setStatus(assignment.status || 'NOT_STARTED')
        setProgress(assignment.progressPercent || 0)
        setChecklist(Array.isArray(assignment.checklist) ? assignment.checklist : [])
    }, [assignment.status, assignment.progressPercent, assignment.checklist])

    const checklistDone = checklist.filter((item) => item.done).length
    const checklistProgress = assignment.checklistProgressPercent ?? (checklist.length > 0 ? Math.round((checklistDone / checklist.length) * 100) : 0)

    const toggleChecklistItem = (itemId) => {
        const nextChecklist = checklist.map((item) => {
            if (item.id !== itemId) return item
            const nextDone = !item.done
            return {
                ...item,
                done: nextDone,
                doneAt: nextDone ? new Date().toISOString() : null,
            }
        })
        const nextDoneCount = nextChecklist.filter((item) => item.done).length
        const nextChecklistProgress = nextChecklist.length > 0 ? Math.round((nextDoneCount / nextChecklist.length) * 100) : 0

        setChecklist(nextChecklist)
        setProgress(nextChecklistProgress)

        if (!saving) {
            queueMicrotask(() => {
                onSave(
                    assignment.id,
                    status,
                    assignment.progressPercent,
                    status,
                    nextChecklistProgress,
                    note,
                    nextChecklist,
                )
            })
        }
    }

    const assignmentFacts = [
        ['Module', assignment.module || 'GENERAL'],
        ['Type', assignment.workType?.replaceAll('_', ' ') || 'OTHER'],
        ['Kind', assignment.assignmentKind?.replaceAll('_', ' ') || 'ONE TIME'],
        ['Priority', assignment.priority || 'MEDIUM'],
        ['Estimated Hours', assignment.estimatedHours || 0],
        ['Complexity', assignment.complexity || 1],
        ['Auto Tracking', assignment.autoTracking?.enabled ? `${String(assignment.autoTracking.metric || '').replaceAll('_', ' ')} • ${assignment.autoTracking.progressPercent || 0}%` : 'Off'],
        ['Assigned By', assignment.assignedByName || assignment.assignedByEmail || assignment.assignedById || '—'],
    ]

    const saveCurrentState = () => {
        onSave(
            assignment.id,
            assignment.status,
            assignment.progressPercent,
            status,
            Math.max(progress, checklistProgress),
            note,
            checklist,
        )
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-base font-semibold text-slate-800">{assignment.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{assignment.workType?.replaceAll('_', ' ') || 'OTHER'} • Module: {assignment.module || 'GENERAL'} • {assignment.priority || 'MEDIUM'}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                    <p>Status: {assignment.status?.replaceAll('_', ' ') || 'NOT STARTED'}</p>
                    <p>Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'}</p>
                </div>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
                {assignmentFacts.map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
                        <p className="text-sm text-slate-700 mt-1 break-words">{value}</p>
                    </div>
                ))}
            </div>

            {assignment.description && <p className="text-sm text-slate-600">{assignment.description}</p>}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800">Checklist</p>
                    <p className="text-xs text-slate-500">{checklistDone}/{checklist.length} done • {checklistProgress}%</p>
                </div>
                <div className="space-y-2">
                    {checklist.length > 0 ? checklist.map((item) => (
                        <label key={item.id} className="flex items-start gap-3 rounded-lg bg-white border border-slate-200 px-3 py-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={Boolean(item.done)}
                                onChange={() => toggleChecklistItem(item.id)}
                                className="mt-1"
                            />
                            <span className={`text-sm ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.title}</span>
                        </label>
                    )) : (
                        <p className="text-sm text-slate-400">No checklist items.</p>
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
                <div className="grid sm:grid-cols-2 gap-3">
                    <label className="space-y-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wide">Status</span>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        >
                            {WORK_STATUS_OPTIONS.map((item) => (
                                <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wide">Progress ({progress}%)</span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={progress}
                            onChange={(e) => {
                                const nextProgress = Number(e.target.value)
                                setProgress(nextProgress)
                                if (!saving) {
                                    queueMicrotask(() => {
                                        onSave(assignment.id, assignment.status, assignment.progressPercent, status, nextProgress, note, checklist)
                                    })
                                }
                            }}
                            className="w-full"
                        />
                    </label>
                </div>

                <button
                    disabled={saving}
                    onClick={saveCurrentState}
                    className="rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-60"
                    type="button"
                >
                    {saving ? 'Saving...' : 'Update Progress'}
                </button>
            </div>

            <label className="space-y-1 block">
                <span className="text-xs text-slate-500 uppercase tracking-wide">Update Note (optional)</span>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-20"
                    placeholder="What changed in this task?"
                />
            </label>

            {assignment.recurrence?.enabled && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Recurring task every {assignment.recurrence.everyDays || 1} day(s){assignment.recurrence.nextDueAt ? ` • Next due ${new Date(assignment.recurrence.nextDueAt).toLocaleDateString()}` : ''}
                </div>
            )}
        </div>
    )
}
