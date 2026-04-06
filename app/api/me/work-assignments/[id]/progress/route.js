import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { getAccessContext } from '@/lib/admin-access'
import {
    canUseEmployeeWorkspace,
    checklistProgressPercent,
    clampProgress,
    normalizeStatus,
    normalizeChecklist,
    normalizeText,
    serializeWorkAssignment,
} from '@/lib/work-assignments'

export const dynamic = 'force-dynamic'

export async function PUT(req, { params }) {
    if (!dbAdmin) {
        return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })
    }

    const ctx = await getAccessContext(req)
    if (!ctx.ok) {
        return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }
    if (!canUseEmployeeWorkspace(ctx)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const assignmentId = normalizeText(params?.id, 160)
        if (!assignmentId) {
            return NextResponse.json({ error: 'Invalid assignment id' }, { status: 400 })
        }

        const assignmentRef = dbAdmin.collection('work_assignments').doc(assignmentId)
        const assignmentSnap = await assignmentRef.get()
        if (!assignmentSnap.exists) {
            return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
        }

        const assignment = assignmentSnap.data() || {}
        const isOwner = assignment.employeeId === ctx.uid
        if (!ctx.isAdmin && !isOwner) {
            return NextResponse.json({ error: 'You can only update your own assignments' }, { status: 403 })
        }

        const body = await req.json()
        const currentStatus = normalizeStatus(assignment.status)
        const requestedStatus = body?.status !== undefined ? normalizeStatus(body.status, currentStatus) : currentStatus
        const nextChecklist = body?.checklist !== undefined
            ? normalizeChecklist(body.checklist)
            : normalizeChecklist(assignment.checklist)
        const checklistPercent = checklistProgressPercent(nextChecklist)
        const requestedProgress = body?.progressPercent !== undefined
            ? clampProgress(body.progressPercent, checklistPercent || clampProgress(assignment.progressPercent, 0))
            : (nextChecklist.length > 0 ? checklistPercent : clampProgress(assignment.progressPercent, 0))

        const now = new Date()
        const updates = {
            status: requestedStatus,
            progressPercent: requestedStatus === 'COMPLETED' ? 100 : requestedProgress,
            updatedAt: now,
            checklist: nextChecklist,
            checklistProgressPercent: checklistPercent,
        }

        if (requestedStatus === 'IN_PROGRESS' && !assignment.startedAt) {
            updates.startedAt = now
        }
        if (requestedStatus === 'COMPLETED') {
            updates.completedAt = now
        } else if (currentStatus === 'COMPLETED' && requestedStatus !== 'COMPLETED') {
            updates.completedAt = null
        }

        const history = Array.isArray(assignment.statusHistory) ? assignment.statusHistory : []
        updates.statusHistory = [
            ...history,
            {
                status: requestedStatus,
                at: now,
                byId: ctx.uid,
                byName: normalizeText(ctx.user?.name, 120) || normalizeText(ctx.user?.email, 120) || 'Employee',
                note: normalizeText(body?.note, 500),
                progressPercent: updates.progressPercent,
            },
        ]

        if (body?.workNote !== undefined) {
            updates.notes = normalizeText(body.workNote, 3000)
        }

        if (body?.notes !== undefined) {
            updates.notes = normalizeText(body.notes, 3000)
        }

        await assignmentRef.set(updates, { merge: true })
        const updatedSnap = await assignmentRef.get()

        return NextResponse.json({
            success: true,
            assignment: serializeWorkAssignment(updatedSnap.id, updatedSnap.data() || {}, timestampToJSON),
        })
    } catch (error) {
        console.error('[me-work-assignments:progress:put]', error)
        return NextResponse.json({ error: error.message || 'Failed to update work progress' }, { status: 500 })
    }
}
