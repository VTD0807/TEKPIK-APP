'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import Loading from '@/components/Loading'
import {
    AUTO_TRACK_METRIC_OPTIONS,
    WORK_ASSIGNMENT_KIND_OPTIONS,
    WORK_MODULE_OPTIONS,
    WORK_PRIORITY_OPTIONS,
    WORK_STATUS_OPTIONS,
    WORK_TYPE_OPTIONS,
} from '@/lib/work-assignments'
import Link from 'next/link'

const MODULE_ACCESS_MAP = {
    PRODUCTS: 'products',
    REVIEWS: 'reviews',
    ANALYTICS: 'analytics',
    USERS: 'users',
    EMPLOYEES: 'employees',
    NOTIFICATIONS: 'notifications',
    SETTINGS: 'settings',
    STORE: 'store',
    CMS: 'cms',
    GENERAL: null,
}

const INITIAL_FORM = {
    title: '',
    description: '',
    employeeId: '',
    workType: 'OTHER',
    module: 'GENERAL',
    assignmentKind: 'ONE_TIME',
    priority: 'MEDIUM',
    estimatedHours: 0,
    complexity: 1,
    dueDate: '',
    checklist: '',
    autoTrackEnabled: false,
    autoTrackMetric: 'PRODUCTS_ADDED',
    autoTrackTarget: 1,
}

export default function AdminWorkAssignmentsPage() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [employees, setEmployees] = useState([])
    const [assignments, setAssignments] = useState([])
    const [form, setForm] = useState(INITIAL_FORM)
    const [filterStatus, setFilterStatus] = useState('ALL')
    const [filterType, setFilterType] = useState('ALL')
    const [filterModule, setFilterModule] = useState('ALL')
    const [message, setMessage] = useState('')

    const isEmployeeScopedUser = (item) => {
        const role = String(item?.role || 'USER').trim().toUpperCase()
        if (role === 'ADMIN') return false
        if (Boolean(item?.employeeAccess)) return true
        return ['MANAGER', 'EDITOR', 'SUPPORT', 'EMPLOYEE'].includes(role)
    }

    const filteredAssignments = useMemo(() => {
        return assignments.filter((item) => {
            if (filterStatus !== 'ALL' && item.status !== filterStatus) return false
            if (filterType !== 'ALL' && item.workType !== filterType) return false
            if (filterModule !== 'ALL' && (item.module || 'GENERAL') !== filterModule) return false
            return true
        })
    }, [assignments, filterStatus, filterType, filterModule])

    const moduleStats = useMemo(() => {
        return filteredAssignments.reduce((acc, item) => {
            const moduleName = item.module || 'GENERAL'
            const status = item.status || 'NOT_STARTED'
            if (!acc[moduleName]) {
                acc[moduleName] = { total: 0, pending: 0, completed: 0 }
            }
            acc[moduleName].total += 1
            if (status === 'COMPLETED') {
                acc[moduleName].completed += 1
            } else {
                acc[moduleName].pending += 1
            }
            return acc
        }, {})
    }, [filteredAssignments])

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
                const headers = { Authorization: `Bearer ${token}` }
                const [usersRes, assignmentsRes] = await Promise.all([
                    fetch('/api/admin/users', { cache: 'no-store', headers }),
                    fetch('/api/admin/work-assignments', { cache: 'no-store', headers }),
                ])

                const usersPayload = await usersRes.json().catch(() => ({}))
                const assignmentsPayload = await assignmentsRes.json().catch(() => ({}))

                if (!usersRes.ok) throw new Error(usersPayload?.error || 'Failed to load users')
                if (!assignmentsRes.ok) throw new Error(assignmentsPayload?.error || 'Failed to load assignments')
                if (cancelled) return

                const users = Array.isArray(usersPayload?.users) ? usersPayload.users : []
                const employeeItems = users
                    .filter(isEmployeeScopedUser)
                    .map((item) => ({
                        id: item.id,
                        name: item.name || item.email || 'Employee',
                        email: item.email || '',
                        dashboardAccess: item.dashboardAccess || {},
                    }))

                const assignmentItems = Array.isArray(assignmentsPayload?.assignments) ? assignmentsPayload.assignments : []

                setEmployees(employeeItems)
                setAssignments(assignmentItems)
                if (!form.employeeId && employeeItems.length > 0) {
                    setForm((prev) => ({ ...prev, employeeId: employeeItems[0].id }))
                }
            } catch (error) {
                if (!cancelled) {
                    setMessage(error?.message || 'Failed to load work assignments')
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [user])

    const selectedEmployee = useMemo(() => employees.find((item) => item.id === form.employeeId) || null, [employees, form.employeeId])

    const assignableModules = useMemo(() => {
        if (!selectedEmployee) return WORK_MODULE_OPTIONS

        const access = selectedEmployee.dashboardAccess || {}
        const allowed = WORK_MODULE_OPTIONS.filter((moduleName) => {
            const accessKey = MODULE_ACCESS_MAP[moduleName]
            if (!accessKey) return true
            return Boolean(access[accessKey] || access.admin)
        })

        return allowed.length > 0 ? allowed : ['GENERAL']
    }, [selectedEmployee])

    const selectedEmployeeModuleLabels = useMemo(() => {
        if (!selectedEmployee) return []
        return assignableModules.filter((item) => item !== 'GENERAL')
    }, [selectedEmployee, assignableModules])

    useEffect(() => {
        if (!assignableModules.includes(form.module)) {
            setForm((prev) => ({ ...prev, module: assignableModules[0] || 'GENERAL' }))
        }
    }, [assignableModules, form.module])

    const submitAssignment = async (event) => {
        event.preventDefault()
        if (!user) return

        setSaving(true)
        setMessage('')

        try {
            const token = await user.getIdToken()
            const payloadBody = {
                ...form,
                estimatedHours: Number(form.estimatedHours) || 0,
                complexity: Number(form.complexity) || 1,
                autoTracking: {
                    enabled: Boolean(form.autoTrackEnabled),
                    metric: form.autoTrackMetric,
                    targetValue: Math.max(1, Number(form.autoTrackTarget) || 1),
                },
            }
            const res = await fetch('/api/admin/work-assignments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payloadBody),
            })

            const payload = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(payload?.error || 'Failed to create assignment')

            if (payload?.assignment) {
                setAssignments((prev) => [payload.assignment, ...prev])
            }

            setForm((prev) => ({
                ...INITIAL_FORM,
                employeeId: prev.employeeId,
                workType: 'OTHER',
                module: prev.module,
                priority: 'MEDIUM',
            }))
            setMessage('Work assigned successfully.')
        } catch (error) {
            setMessage(error?.message || 'Failed to create assignment')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <Loading />

    return (
        <div className="space-y-6 pb-24">
            <div>
                <h1 className="text-2xl text-slate-500">Work <span className="text-slate-800 font-medium">Assignments</span></h1>
                <p className="text-sm text-slate-400 mt-1">Assign work by employee and track status/progress in one place.</p>
            </div>

            {message && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                    {message}
                </div>
            )}

            <form onSubmit={submitAssignment} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <h2 className="text-base font-semibold text-slate-800">Create New Work</h2>

                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <Field label="Title" required>
                        <input
                            value={form.title}
                            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            placeholder="Example: Write comparison review"
                            required
                        />
                    </Field>

                    <Field label="Employee" required>
                        <select
                            value={form.employeeId}
                            onChange={(e) => setForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            required
                        >
                            <option value="">Select employee</option>
                            {employees.map((employee) => (
                                <option key={employee.id} value={employee.id}>{employee.name} ({employee.email || employee.id})</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Work Type" required>
                        <select
                            value={form.workType}
                            onChange={(e) => setForm((prev) => ({ ...prev, workType: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        >
                            {WORK_TYPE_OPTIONS.map((item) => (
                                <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Module" required>
                        <select
                            value={form.module}
                            onChange={(e) => setForm((prev) => ({ ...prev, module: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        >
                            {assignableModules.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">Synced from Employee Access dashboard permissions for selected employee.</p>
                        {selectedEmployee && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {selectedEmployeeModuleLabels.length > 0 ? selectedEmployeeModuleLabels.map((item) => (
                                    <span key={item} className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        {item}
                                    </span>
                                )) : (
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                        No module access assigned
                                    </span>
                                )}
                            </div>
                        )}
                    </Field>

                    <Field label="Priority" required>
                        <select
                            value={form.priority}
                            onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        >
                            {WORK_PRIORITY_OPTIONS.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Assignment Kind" required>
                        <select
                            value={form.assignmentKind}
                            onChange={(e) => setForm((prev) => ({ ...prev, assignmentKind: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        >
                            {WORK_ASSIGNMENT_KIND_OPTIONS.map((item) => (
                                <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Estimated Hours">
                        <input
                            value={form.estimatedHours}
                            onChange={(e) => setForm((prev) => ({ ...prev, estimatedHours: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            type="number"
                            min={0}
                        />
                    </Field>

                    <Field label="Complexity (1-5)">
                        <input
                            value={form.complexity}
                            onChange={(e) => setForm((prev) => ({ ...prev, complexity: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            type="number"
                            min={1}
                            max={5}
                        />
                    </Field>

                    <Field label="Due Date">
                        <input
                            value={form.dueDate}
                            onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            type="date"
                        />
                    </Field>
                </div>

                <Field label="Description">
                    <textarea
                        value={form.description}
                        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-28"
                        placeholder="Add work details and expected output"
                    />
                </Field>

                <Field label="Checklist (one item per line)">
                    <textarea
                        value={form.checklist}
                        onChange={(e) => setForm((prev) => ({ ...prev, checklist: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-24"
                        placeholder={'Collect data\nCreate draft\nSubmit for review'}
                    />
                </Field>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                            type="checkbox"
                            checked={Boolean(form.autoTrackEnabled)}
                            onChange={(e) => setForm((prev) => ({ ...prev, autoTrackEnabled: e.target.checked }))}
                        />
                        Enable Auto Tracking
                    </label>

                    {form.autoTrackEnabled && (
                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                            <Field label="Auto Metric" required>
                                <select
                                    value={form.autoTrackMetric}
                                    onChange={(e) => setForm((prev) => ({ ...prev, autoTrackMetric: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                >
                                    {AUTO_TRACK_METRIC_OPTIONS.map((item) => (
                                        <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>
                                    ))}
                                </select>
                            </Field>

                            <Field label="Target Value" required>
                                <input
                                    value={form.autoTrackTarget}
                                    onChange={(e) => setForm((prev) => ({ ...prev, autoTrackTarget: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                    type="number"
                                    min={1}
                                />
                            </Field>
                        </div>
                    )}
                </div>

                <button
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-60"
                    type="submit"
                >
                    {saving ? 'Assigning...' : 'Assign Work'}
                </button>
            </form>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-slate-800">Assigned Work List</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="ALL">All Statuses</option>
                            {WORK_STATUS_OPTIONS.map((item) => (
                                <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>
                            ))}
                        </select>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="ALL">All Types</option>
                            {WORK_TYPE_OPTIONS.map((item) => (
                                <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>
                            ))}
                        </select>
                        <select
                            value={filterModule}
                            onChange={(e) => setFilterModule(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="ALL">All Modules</option>
                            {WORK_MODULE_OPTIONS.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {Object.entries(moduleStats).map(([moduleName, stats]) => (
                        <div key={moduleName} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-500">{moduleName}</p>
                            <div className="mt-2 flex items-center gap-3 text-sm text-slate-700">
                                <span>Total: {stats.total}</span>
                                <span>Pending: {stats.pending}</span>
                                <span>Done: {stats.completed}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-3">
                    {filteredAssignments.length > 0 ? filteredAssignments.map((item) => (
                        <Link
                            key={item.id}
                            href={`/admin/work-assignments/${item.id}`}
                            className="block rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:bg-slate-50 transition"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                                    <p className="text-xs text-slate-500">{item.employeeName || item.employeeEmail || item.employeeId}</p>
                                    <p className="text-xs text-slate-400">Click to open full details</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-xs text-slate-500">{item.workType.replaceAll('_', ' ')}</p>
                                    <p className="text-xs text-slate-500">Module: {item.module || 'GENERAL'}</p>
                                    <p className="text-xs text-slate-500">{item.priority}</p>
                                </div>
                            </div>
                            {item.description && <p className="text-sm text-slate-600 mt-3">{item.description}</p>}
                            <div className="mt-3 grid sm:grid-cols-4 gap-2 text-xs">
                                <Badge label="Status" value={item.status.replaceAll('_', ' ')} />
                                <Badge label="Progress" value={`${item.progressPercent || 0}%`} />
                                <Badge label="Due" value={item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date'} />
                                <Badge label="Updated" value={item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '—'} />
                            </div>
                        </Link>
                    )) : (
                        <p className="text-sm text-slate-500">No work assignments found for current filters.</p>
                    )}
                </div>
            </div>
        </div>
    )
}

function Field({ label, required, children }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {label}
                {required ? ' *' : ''}
            </span>
            {children}
        </label>
    )
}

function Badge({ label, value }) {
    return (
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
            <p className="text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-slate-700 font-medium mt-1">{value}</p>
        </div>
    )
}
