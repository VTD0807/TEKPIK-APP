import { NextResponse } from 'next/server'
import { dbAdmin, authAdmin, timestampToJSON } from '@/lib/firebase-admin'
import { isAdminEmail } from '@/lib/admin'
import { getAccessContext, hasAdminAccess } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

export async function GET(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const accessCtx = await getAccessContext(req)
    if (!accessCtx.ok) {
        return NextResponse.json({ error: accessCtx.error }, { status: accessCtx.status })
    }
    if (!hasAdminAccess(accessCtx, 'users')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        // Always use a plain collection scan and sort in memory so docs
        // without createdAt are not excluded from results.
        const snapshot = await dbAdmin.collection('users').get()
        let users = []
        const usersById = new Map()
        snapshot.forEach(doc => {
            let data = doc.data()
            const normalizedRole = String(data.role || 'USER').trim().toUpperCase()
            const normalizedTags = normalizeList(data.tags || data.employeeTags)
            const normalizedSectors = normalizeList(data.sectors)
            const normalizedAccess = normalizeDashboardAccess(data.dashboardAccess)
            const normalizedUser = {
                id: doc.id,
                ...data,
                role: normalizedRole,
                tags: normalizedTags,
                employeeTags: normalizeList(data.employeeTags || data.tags),
                sectors: normalizedSectors,
                dashboardAccess: normalizedAccess,
                employeeAccess: resolveEmployeeAccess(data.employeeAccess, normalizedRole),
                deviceId: data.deviceId || data.lastDeviceId || null,
                deviceIds: Array.isArray(data.deviceIds) ? data.deviceIds : (data.deviceId ? [data.deviceId] : []),
                createdAt: data.createdAt ? timestampToJSON(data.createdAt) : new Date().toISOString()
            }
            users.push(normalizedUser)
            usersById.set(doc.id, normalizedUser)
        })

        let authTotal = 0
        let mergedFromAuth = 0
        if (authAdmin) {
            let nextPageToken = undefined
            do {
                const result = await authAdmin.listUsers(1000, nextPageToken)
                nextPageToken = result.pageToken
                authTotal += result.users.length

                result.users.forEach(u => {
                    const existing = usersById.get(u.uid)
                    if (existing) {
                        if (!existing.email && u.email) existing.email = u.email
                        if (!existing.name && (u.displayName || u.email)) {
                            existing.name = u.displayName || u.email.split('@')[0]
                        }
                        if (!existing.image && u.photoURL) existing.image = u.photoURL
                        if (!existing.createdAt && u.metadata?.creationTime) {
                            existing.createdAt = u.metadata.creationTime
                        }
                        return
                    }

                    const authUser = {
                        id: u.uid,
                        name: u.displayName || (u.email ? u.email.split('@')[0] : 'User'),
                        email: u.email || '',
                        image: u.photoURL || '',
                        role: isAdminEmail(u.email) ? 'ADMIN' : 'USER',
                        tags: [],
                        employeeTags: [],
                        sectors: [],
                        dashboardAccess: normalizeDashboardAccess(),
                        employeeAccess: false,
                        deviceId: null,
                        deviceIds: [],
                        createdAt: u.metadata?.creationTime || new Date().toISOString(),
                    }

                    users.push(authUser)
                    usersById.set(authUser.id, authUser)
                    mergedFromAuth += 1
                })
            } while (nextPageToken)
        }

        users.sort((a, b) => {
            const aTime = Date.parse(a.createdAt || '') || 0
            const bTime = Date.parse(b.createdAt || '') || 0
            return bTime - aTime
        })

        return NextResponse.json({
            users,
            _meta: {
                firestoreUsers: snapshot.size,
                authUsers: authTotal,
                mergedFromAuth,
            },
        })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const accessCtx = await getAccessContext(req)
    if (!accessCtx.ok) {
        return NextResponse.json({ error: accessCtx.error }, { status: accessCtx.status })
    }
    if (!hasAdminAccess(accessCtx, 'users')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const { userId, role, dashboardAccess, tags, employeeTags, sectors, employeeAccess } = await req.json()
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

        const updates = {}
        const hasTagsField = tags !== undefined || employeeTags !== undefined
        const hasSectorsField = sectors !== undefined
        const hasDashboardAccessField = dashboardAccess !== undefined
        const hasEmployeeAccessField = employeeAccess !== undefined
        const normalizedRole = role ? String(role).trim().toUpperCase() : null
        if (normalizedRole) updates.role = normalizedRole
        const normalizedTags = hasTagsField ? normalizeList(tags ?? employeeTags) : null
        const normalizedSectors = hasSectorsField ? normalizeList(sectors) : null
        const normalizedDashboardAccess = hasDashboardAccessField ? normalizeDashboardAccess(dashboardAccess) : null

        if (hasTagsField) {
            updates.tags = normalizedTags
            updates.employeeTags = normalizedTags
        }
        if (hasSectorsField) updates.sectors = normalizedSectors
        if (hasDashboardAccessField) updates.dashboardAccess = normalizedDashboardAccess

        if (hasEmployeeAccessField || normalizedRole || hasTagsField || hasSectorsField || hasDashboardAccessField) {
            const computedEmployeeAccess = deriveEmployeeAccess({
                employeeAccess,
                role: normalizedRole,
                tags: normalizedTags,
                sectors: normalizedSectors,
                dashboardAccess: normalizedDashboardAccess,
            })
            updates.employeeAccess = computedEmployeeAccess

            if (isEmployeeRole(normalizedRole)) {
                updates.employeeAccess = true
            }
            if ((computedEmployeeAccess === true || isEmployeeRole(normalizedRole)) && !normalizedRole) {
                updates.role = 'EMPLOYEE'
            }
        }
        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
        }

        const userRef = dbAdmin.collection('users').doc(userId)
        const existing = await userRef.get()
        if (!existing.exists) {
            updates.createdAt = new Date()
        }

        await userRef.set(updates, { merge: true })
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

function normalizeList(value) {
    if (Array.isArray(value)) {
        return value.map(item => String(item).trim()).filter(Boolean)
    }
    if (typeof value === 'string') {
        return value.split(',').map(item => item.trim()).filter(Boolean)
    }
    if (value == null) {
        return []
    }
    return []
}

function normalizeDashboardAccess(value = {}) {
    const source = value && typeof value === 'object' ? value : {}
    return {
        cms: Boolean(source.cms),
        admin: Boolean(source.admin),
        store: Boolean(source.store),
        analytics: Boolean(source.analytics),
        users: Boolean(source.users),
        employees: Boolean(source.employees),
        reviews: Boolean(source.reviews),
        products: Boolean(source.products),
        notifications: Boolean(source.notifications),
        settings: Boolean(source.settings),
    }
}

function deriveEmployeeAccess({ employeeAccess, role, tags, sectors, dashboardAccess }) {
    if (isEmployeeRole(role)) return true
    if (typeof employeeAccess === 'boolean') return employeeAccess

    const normalizedRole = String(role || 'USER').trim().toUpperCase()
    if (normalizedRole === 'ADMIN') return false
    if (['MANAGER', 'EDITOR', 'SUPPORT', 'EMPLOYEE'].includes(normalizedRole)) return true
    if (normalizeList(tags).length > 0) return true
    if (normalizeList(sectors).length > 0) return true
    return Object.values(normalizeDashboardAccess(dashboardAccess)).some(Boolean)
}

function resolveEmployeeAccess(rawValue, normalizedRole) {
    if (isEmployeeRole(normalizedRole)) return true
    if (typeof rawValue === 'boolean') return rawValue
    // Legacy fallback for old records before employeeAccess existed.
    return false
}

function isEmployeeRole(role) {
    const normalizedRole = String(role || 'USER').trim().toUpperCase()
    return ['MANAGER', 'EDITOR', 'SUPPORT', 'EMPLOYEE'].includes(normalizedRole)
}
