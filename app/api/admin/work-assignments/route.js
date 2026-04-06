import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'
import {
    AUTO_TRACK_METRIC_OPTIONS,
    WORK_ASSIGNMENT_KIND_OPTIONS,
    WORK_MODULE_OPTIONS,
    WORK_PRIORITY_OPTIONS,
    WORK_STATUS_OPTIONS,
    WORK_TYPE_OPTIONS,
    buildAutoTracking,
    checklistProgressPercent,
    clampProgress,
    getEmployeeMetricSnapshot,
    normalizeAssignmentKind,
    normalizeAutoMetric,
    normalizeChecklist,
    normalizeModule,
    normalizePriority,
    normalizeStatus,
    normalizeText,
    normalizeType,
    parseOptionalDate,
    serializeWorkAssignment,
} from '@/lib/work-assignments'

export const dynamic = 'force-dynamic'

async function syncAutoTrackedAssignments(docs) {
    const active = docs.filter((doc) => {
        const data = doc.data() || {}
        const tracking = data.autoTracking && typeof data.autoTracking === 'object' ? data.autoTracking : {}
        return Boolean(tracking.enabled) && normalizeStatus(data.status) !== 'COMPLETED'
    })

    if (active.length === 0) return

    const metricsByEmployee = new Map()
    for (const doc of active) {
        const data = doc.data() || {}
        const employeeId = String(data.employeeId || '').trim()
        if (!employeeId) continue
        if (!metricsByEmployee.has(employeeId)) {
            metricsByEmployee.set(employeeId, await getEmployeeMetricSnapshot(dbAdmin, employeeId))
        }
    }

    for (const doc of active) {
        const data = doc.data() || {}
        const employeeId = String(data.employeeId || '').trim()
        const metrics = metricsByEmployee.get(employeeId)
        if (!metrics) continue

        const nextAuto = buildAutoTracking(data.autoTracking, metrics)
        const currentPercent = clampProgress(data.progressPercent, 0)
        const nextPercent = nextAuto.progressPercent
        const nextStatus = nextPercent >= 100 ? 'COMPLETED' : (nextPercent > 0 ? 'IN_PROGRESS' : normalizeStatus(data.status))

        if (nextPercent === currentPercent && nextStatus === normalizeStatus(data.status)) {
            continue
        }

        const now = new Date()
        const history = Array.isArray(data.statusHistory) ? data.statusHistory : []
        await dbAdmin.collection('work_assignments').doc(doc.id).set({
            autoTracking: nextAuto,
            progressPercent: nextPercent,
            status: nextStatus,
            startedAt: nextStatus === 'IN_PROGRESS' ? (data.startedAt || now) : (data.startedAt || null),
            completedAt: nextStatus === 'COMPLETED' ? now : (nextStatus !== 'COMPLETED' ? null : data.completedAt || null),
            updatedAt: now,
            statusHistory: [
                ...history,
                {
                    status: nextStatus,
                    at: now,
                    byId: 'system:auto-tracker',
                    byName: 'System Auto Tracker',
                    note: `Auto progress synced from ${nextAuto.metric}`,
                    progressPercent: nextPercent,
                },
            ],
        }, { merge: true })
    }
}

function parseChecklistInput(value) {
    if (Array.isArray(value)) return normalizeChecklist(value)
    if (typeof value === 'string') {
        const lines = value
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean)
        return normalizeChecklist(lines)
    }
    return []
}

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

function isModuleAllowedForEmployee(moduleName, employeeData) {
    const normalizedModule = normalizeModule(moduleName)
    const accessKey = MODULE_ACCESS_MAP[normalizedModule]
    if (!accessKey) return true
    const access = employeeData?.dashboardAccess && typeof employeeData.dashboardAccess === 'object'
        ? employeeData.dashboardAccess
        : {}
    return Boolean(access[accessKey] || access.admin)
}

export async function GET(req) {
    if (!dbAdmin) {
        return NextResponse.json({ assignments: [], error: 'DB not initialized' }, { status: 500 })
    }

    const ctx = await getAccessContext(req)
    if (!ctx.ok) {
        return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }
    if (!hasAdminAccess(ctx, 'employees')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const employeeId = normalizeText(searchParams.get('employeeId'), 128)
        const statusFilter = normalizeStatus(searchParams.get('status') || '', '')
        const typeFilter = normalizeType(searchParams.get('workType') || '', '')
        const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit')) || 100))

        const baseQuery = dbAdmin.collection('work_assignments')
        let snap
        try {
            snap = await baseQuery.orderBy('createdAt', 'desc').limit(limit).get()
        } catch (error) {
            if (!String(error?.message || '').toLowerCase().includes('requires an index') && !String(error?.message || '').includes('FAILED_PRECONDITION')) {
                throw error
            }
            snap = await baseQuery.limit(limit).get()
        }

        await syncAutoTrackedAssignments(snap.docs)

        let refreshedSnap
        try {
            refreshedSnap = await baseQuery.orderBy('createdAt', 'desc').limit(limit).get()
        } catch (error) {
            if (!String(error?.message || '').toLowerCase().includes('requires an index') && !String(error?.message || '').includes('FAILED_PRECONDITION')) {
                throw error
            }
            refreshedSnap = await baseQuery.limit(limit).get()
        }

        let assignments = refreshedSnap.docs.map((doc) => serializeWorkAssignment(doc.id, doc.data() || {}, timestampToJSON))
        assignments.sort((a, b) => {
            const aTime = Date.parse(a.createdAt || '') || 0
            const bTime = Date.parse(b.createdAt || '') || 0
            return bTime - aTime
        })

        if (employeeId) {
            assignments = assignments.filter((item) => item.employeeId === employeeId)
        }
        if (statusFilter) {
            assignments = assignments.filter((item) => item.status === statusFilter)
        }
        if (typeFilter) {
            assignments = assignments.filter((item) => item.workType === typeFilter)
        }

        return NextResponse.json({
            assignments,
            filters: {
                employeeId: employeeId || null,
                status: statusFilter || null,
                workType: typeFilter || null,
            },
            options: {
                statuses: WORK_STATUS_OPTIONS,
                workTypes: WORK_TYPE_OPTIONS,
                priorities: WORK_PRIORITY_OPTIONS,
                modules: WORK_MODULE_OPTIONS,
                assignmentKinds: WORK_ASSIGNMENT_KIND_OPTIONS,
                autoTrackMetrics: AUTO_TRACK_METRIC_OPTIONS,
            },
        })
    } catch (error) {
        console.error('[admin-work-assignments:get]', error)
        return NextResponse.json({ assignments: [], error: error.message || 'Failed to load assignments' }, { status: 500 })
    }
}

export async function POST(req) {
    if (!dbAdmin) {
        return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    }

    const ctx = await getAccessContext(req)
    if (!ctx.ok) {
        return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }
    if (!hasAdminAccess(ctx, 'employees')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const title = normalizeText(body?.title, 180)
        const description = normalizeText(body?.description, 3000)
        const employeeId = normalizeText(body?.employeeId, 128)

        if (!title) {
            return NextResponse.json({ error: 'title is required' }, { status: 400 })
        }
        if (!employeeId) {
            return NextResponse.json({ error: 'employeeId is required' }, { status: 400 })
        }

        const employeeRef = dbAdmin.collection('users').doc(employeeId)
        const employeeSnap = await employeeRef.get()
        if (!employeeSnap.exists) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
        }

        const employeeData = employeeSnap.data() || {}
        const module = normalizeModule(body?.module)
        if (!isModuleAllowedForEmployee(module, employeeData)) {
            return NextResponse.json({ error: `Selected employee does not have ${module} module access` }, { status: 400 })
        }
        const now = new Date()
        const dueDate = parseOptionalDate(body?.dueDate)
        const checklist = parseChecklistInput(body?.checklist)
        const checklistPercent = checklistProgressPercent(checklist)
        const progressPercent = clampProgress(body?.progressPercent, checklistPercent)
        const status = normalizeStatus(body?.status, progressPercent >= 100 ? 'COMPLETED' : 'NOT_STARTED')
        const autoTrackingInput = body?.autoTracking && typeof body.autoTracking === 'object' ? body.autoTracking : {}
        const autoTrackingEnabled = Boolean(autoTrackingInput.enabled)
        const metrics = autoTrackingEnabled ? await getEmployeeMetricSnapshot(dbAdmin, employeeId) : null
        const autoTracking = buildAutoTracking({
            enabled: autoTrackingEnabled,
            metric: normalizeAutoMetric(autoTrackingInput.metric),
            baselineValue: autoTrackingEnabled ? Number(metrics?.[normalizeAutoMetric(autoTrackingInput.metric)] || 0) : 0,
            targetValue: Math.max(1, Number(autoTrackingInput.targetValue) || 1),
        }, metrics)
        const effectiveProgress = autoTrackingEnabled ? autoTracking.progressPercent : progressPercent
        const effectiveStatus = autoTrackingEnabled
            ? (effectiveProgress >= 100 ? 'COMPLETED' : (effectiveProgress > 0 ? 'IN_PROGRESS' : status))
            : status

        const payload = {
            title,
            description,
            employeeId,
            employeeName: normalizeText(employeeData?.name, 120) || normalizeText(employeeData?.email, 120) || 'Employee',
            employeeEmail: normalizeText(employeeData?.email, 180),
            assignedById: ctx.uid,
            assignedByName: normalizeText(ctx.user?.name, 120) || normalizeText(ctx.user?.email, 120) || 'Admin',
            assignedByEmail: normalizeText(ctx.user?.email, 180),
            status: effectiveStatus,
            workType: normalizeType(body?.workType),
            module,
            assignmentKind: normalizeAssignmentKind(body?.assignmentKind),
            priority: normalizePriority(body?.priority),
            progressPercent: effectiveProgress,
            estimatedHours: Math.max(0, Number(body?.estimatedHours) || 0),
            complexity: Math.max(1, Math.min(5, Number(body?.complexity) || 1)),
            dueDate,
            startedAt: effectiveStatus === 'IN_PROGRESS' ? now : null,
            completedAt: effectiveStatus === 'COMPLETED' ? now : null,
            notes: normalizeText(body?.notes, 3000),
            checklist,
            recurrence: {
                enabled: normalizeAssignmentKind(body?.assignmentKind) === 'RECURRING' || Boolean(body?.recurrence?.enabled),
                everyDays: Math.max(1, Number(body?.recurrence?.everyDays) || 7),
                nextDueAt: dueDate,
            },
            autoTracking,
            createdAt: now,
            updatedAt: now,
            statusHistory: [
                {
                    status: effectiveStatus,
                    at: now,
                    byId: ctx.uid,
                    byName: normalizeText(ctx.user?.name, 120) || normalizeText(ctx.user?.email, 120) || 'Admin',
                    note: autoTrackingEnabled ? `Assignment created with auto tracking (${autoTracking.metric})` : 'Assignment created',
                    progressPercent: effectiveProgress,
                },
            ],
        }

        const assignmentRef = await dbAdmin.collection('work_assignments').add(payload)
        const createdSnap = await assignmentRef.get()

        return NextResponse.json({
            success: true,
            assignment: serializeWorkAssignment(createdSnap.id, createdSnap.data() || {}, timestampToJSON),
        })
    } catch (error) {
        console.error('[admin-work-assignments:post]', error)
        return NextResponse.json({ error: error.message || 'Failed to create assignment' }, { status: 500 })
    }
}
