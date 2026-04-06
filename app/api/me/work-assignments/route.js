import { NextResponse } from 'next/server'
import { dbAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { getAccessContext } from '@/lib/admin-access'
import { canUseEmployeeWorkspace, buildAutoTracking, getEmployeeMetricSnapshot, normalizeStatus, serializeWorkAssignment } from '@/lib/work-assignments'

export const dynamic = 'force-dynamic'

function isIndexError(error) {
    const message = String(error?.message || '')
    return message.includes('FAILED_PRECONDITION') || message.toLowerCase().includes('requires an index')
}

async function syncEmployeeAutoTrackedAssignments(docs, employeeId) {
    const active = docs.filter((doc) => {
        const data = doc.data() || {}
        const tracking = data.autoTracking && typeof data.autoTracking === 'object' ? data.autoTracking : {}
        return data.employeeId === employeeId && Boolean(tracking.enabled) && normalizeStatus(data.status) !== 'COMPLETED'
    })

    if (active.length === 0) return

    const metrics = await getEmployeeMetricSnapshot(dbAdmin, employeeId)
    for (const doc of active) {
        const data = doc.data() || {}
        const nextAuto = buildAutoTracking(data.autoTracking, metrics)
        const currentPercent = Number(data.progressPercent || 0)
        if (nextAuto.progressPercent === currentPercent) continue

        const now = new Date()
        const history = Array.isArray(data.statusHistory) ? data.statusHistory : []
        await dbAdmin.collection('work_assignments').doc(doc.id).set({
            autoTracking: nextAuto,
            progressPercent: nextAuto.progressPercent,
            status: nextAuto.progressPercent >= 100 ? 'COMPLETED' : (nextAuto.progressPercent > 0 ? 'IN_PROGRESS' : normalizeStatus(data.status)),
            updatedAt: now,
            statusHistory: [
                ...history,
                {
                    status: nextAuto.progressPercent >= 100 ? 'COMPLETED' : (nextAuto.progressPercent > 0 ? 'IN_PROGRESS' : normalizeStatus(data.status)),
                    at: now,
                    byId: 'system:auto-tracker',
                    byName: 'System Auto Tracker',
                    note: `Auto progress synced from ${nextAuto.metric}`,
                    progressPercent: nextAuto.progressPercent,
                },
            ],
        }, { merge: true })
    }
}

export async function GET(req) {
    if (!dbAdmin) {
        return NextResponse.json({ assignments: [], error: 'DB not initialized' }, { status: 500 })
    }

    const ctx = await getAccessContext(req)
    if (!ctx.ok) {
        return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }
    if (!canUseEmployeeWorkspace(ctx)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const status = String(searchParams.get('status') || '').trim().toUpperCase()
        const employeeEmail = String(ctx.user?.email || '').trim().toLowerCase()

        const baseQuery = dbAdmin.collection('work_assignments').where('employeeId', '==', ctx.uid)
        let snap
        try {
            snap = await baseQuery.orderBy('createdAt', 'desc').limit(200).get()
        } catch (error) {
            if (!isIndexError(error)) throw error
            snap = await baseQuery.limit(200).get()
        }

        let emailSnap = null
        let usedEmailFallback = false

        if (snap.docs.length === 0 && employeeEmail) {
            const byEmailQuery = dbAdmin.collection('work_assignments').where('employeeEmail', '==', employeeEmail)
            try {
                emailSnap = await byEmailQuery.orderBy('createdAt', 'desc').limit(200).get()
            } catch (error) {
                if (!isIndexError(error)) throw error
                emailSnap = await byEmailQuery.limit(200).get()
            }
            usedEmailFallback = Boolean(emailSnap?.docs?.length)
        }

        const sourceDocs = [...(snap.docs || []), ...(emailSnap?.docs || [])]
        await syncEmployeeAutoTrackedAssignments(sourceDocs, ctx.uid)

        let refreshedDocs = null
        try {
            refreshedDocs = await baseQuery.orderBy('createdAt', 'desc').limit(200).get()
        } catch (error) {
            if (!isIndexError(error)) throw error
            refreshedDocs = await baseQuery.limit(200).get()
        }

        let emailRefreshedDocs = null
        if (usedEmailFallback && employeeEmail) {
            const byEmailQuery = dbAdmin.collection('work_assignments').where('employeeEmail', '==', employeeEmail)
            try {
                emailRefreshedDocs = await byEmailQuery.orderBy('createdAt', 'desc').limit(200).get()
            } catch (error) {
                if (!isIndexError(error)) throw error
                emailRefreshedDocs = await byEmailQuery.limit(200).get()
            }
        }

        const mergedDocs = new Map()
        ;[...(refreshedDocs?.docs || []), ...(emailRefreshedDocs?.docs || [])].forEach((doc) => {
            mergedDocs.set(doc.id, doc)
        })

        let assignments = Array.from(mergedDocs.values()).map((doc) => serializeWorkAssignment(doc.id, doc.data() || {}, timestampToJSON))

        assignments.sort((a, b) => {
            const aTime = Date.parse(a.createdAt || '') || 0
            const bTime = Date.parse(b.createdAt || '') || 0
            return bTime - aTime
        })

        if (status) {
            assignments = assignments.filter((item) => item.status === status)
        }

        return NextResponse.json({
            assignments,
            _meta: {
                uid: ctx.uid,
                email: employeeEmail || null,
                matchedBy: assignments.some((item) => item.employeeId === ctx.uid) ? 'employeeId' : (assignments.length > 0 ? 'employeeEmail' : 'none'),
            },
        })
    } catch (error) {
        console.error('[me-work-assignments:get]', error)
        return NextResponse.json({ assignments: [], error: error.message || 'Failed to load work assignments' }, { status: 500 })
    }
}
