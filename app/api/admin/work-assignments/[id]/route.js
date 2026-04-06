import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'
import {
    clampProgress,
    normalizePriority,
    normalizeStatus,
    normalizeText,
    normalizeType,
    parseOptionalDate,
    serializeWorkAssignment,
} from '@/lib/work-assignments'

export const dynamic = 'force-dynamic'

async function resolveAssignmentId(params) {
    const resolvedParams = await params
    return normalizeText(resolvedParams?.id, 160)
}

export async function GET(req, { params }) {
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
        const assignmentId = await resolveAssignmentId(params)
        if (!assignmentId) return NextResponse.json({ error: 'Invalid assignment id' }, { status: 400 })

        const snap = await dbAdmin.collection('work_assignments').doc(assignmentId).get()
        if (!snap.exists) {
            return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
        }

        return NextResponse.json({ assignment: serializeWorkAssignment(snap.id, snap.data() || {}, timestampToJSON) })
    } catch (error) {
        console.error('[admin-work-assignments:id:get]', error)
        return NextResponse.json({ error: error.message || 'Failed to load assignment' }, { status: 500 })
    }
}

export async function PUT(req, { params }) {
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
        const assignmentId = await resolveAssignmentId(params)
        if (!assignmentId) return NextResponse.json({ error: 'Invalid assignment id' }, { status: 400 })

        const assignmentRef = dbAdmin.collection('work_assignments').doc(assignmentId)
        const existingSnap = await assignmentRef.get()
        if (!existingSnap.exists) {
            return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
        }

        const existing = existingSnap.data() || {}
        const body = await req.json()
        const now = new Date()
        const updates = { updatedAt: now }

        if (body?.title !== undefined) updates.title = normalizeText(body.title, 180)
        if (body?.description !== undefined) updates.description = normalizeText(body.description, 3000)
        if (body?.notes !== undefined) updates.notes = normalizeText(body.notes, 3000)
        if (body?.workType !== undefined) updates.workType = normalizeType(body.workType)
        if (body?.priority !== undefined) updates.priority = normalizePriority(body.priority)
        if (body?.dueDate !== undefined) updates.dueDate = parseOptionalDate(body.dueDate)

        if (body?.employeeId !== undefined) {
            const employeeId = normalizeText(body.employeeId, 128)
            if (!employeeId) {
                return NextResponse.json({ error: 'employeeId cannot be empty' }, { status: 400 })
            }
            const employeeSnap = await dbAdmin.collection('users').doc(employeeId).get()
            if (!employeeSnap.exists) {
                return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
            }
            const employeeData = employeeSnap.data() || {}
            updates.employeeId = employeeId
            updates.employeeName = normalizeText(employeeData?.name, 120) || normalizeText(employeeData?.email, 120) || 'Employee'
            updates.employeeEmail = normalizeText(employeeData?.email, 180)
        }

        const nextStatus = body?.status !== undefined
            ? normalizeStatus(body.status, normalizeStatus(existing.status))
            : normalizeStatus(existing.status)

        const nextProgress = body?.progressPercent !== undefined
            ? clampProgress(body.progressPercent, clampProgress(existing.progressPercent, 0))
            : clampProgress(existing.progressPercent, 0)

        let statusChanged = false
        if (body?.status !== undefined) {
            updates.status = nextStatus
            statusChanged = nextStatus !== normalizeStatus(existing.status)
        }
        if (body?.progressPercent !== undefined) {
            updates.progressPercent = nextProgress
        }

        if (nextStatus === 'IN_PROGRESS' && !existing.startedAt) {
            updates.startedAt = now
        }
        if (nextStatus === 'COMPLETED') {
            updates.progressPercent = 100
            updates.completedAt = now
        } else if (body?.status !== undefined && normalizeStatus(existing.status) === 'COMPLETED') {
            updates.completedAt = null
        }

        if (statusChanged || body?.progressPercent !== undefined) {
            const statusHistory = Array.isArray(existing.statusHistory) ? existing.statusHistory : []
            updates.statusHistory = [
                ...statusHistory,
                {
                    status: nextStatus,
                    at: now,
                    byId: ctx.uid,
                    byName: normalizeText(ctx.user?.name, 120) || normalizeText(ctx.user?.email, 120) || 'Admin',
                    note: normalizeText(body?.statusNote || body?.note, 500),
                    progressPercent: updates.progressPercent ?? nextProgress,
                },
            ]
        }

        await assignmentRef.set(updates, { merge: true })
        const updatedSnap = await assignmentRef.get()

        return NextResponse.json({
            success: true,
            assignment: serializeWorkAssignment(updatedSnap.id, updatedSnap.data() || {}, timestampToJSON),
        })
    } catch (error) {
        console.error('[admin-work-assignments:id:put]', error)
        return NextResponse.json({ error: error.message || 'Failed to update assignment' }, { status: 500 })
    }
}

export async function DELETE(req, { params }) {
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
        const assignmentId = await resolveAssignmentId(params)
        if (!assignmentId) return NextResponse.json({ error: 'Invalid assignment id' }, { status: 400 })

        const assignmentRef = dbAdmin.collection('work_assignments').doc(assignmentId)
        const existingSnap = await assignmentRef.get()
        if (!existingSnap.exists) {
            return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
        }

        await assignmentRef.delete()
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[admin-work-assignments:id:delete]', error)
        return NextResponse.json({ error: error.message || 'Failed to delete assignment' }, { status: 500 })
    }
}
