import { NextResponse } from 'next/server'
import { getAccessContext, normalizeDashboardAccess } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

const MODULES = [
    { key: 'admin', label: 'Admin Home', href: '/admin' },
    { key: 'employees', label: 'Employee Performance', href: '/admin/employees' },
    { key: 'users', label: 'Users', href: '/admin/users' },
    { key: 'analytics', label: 'Analytics', href: '/admin/data' },
    { key: 'products', label: 'Products', href: '/admin/products' },
    { key: 'reviews', label: 'Reviews', href: '/admin/reviews' },
    { key: 'notifications', label: 'Notifications', href: '/admin/notifications' },
    { key: 'settings', label: 'Settings', href: '/admin/settings' },
    { key: 'cms', label: 'CMS', href: '/cms' },
    { key: 'store', label: 'Store', href: '/store' },
]

const EMPLOYEE_MODULE_KEYS = ['employees', 'users', 'analytics', 'products', 'reviews', 'notifications', 'settings', 'cms', 'store']

export async function GET(req) {
    const ctx = await getAccessContext(req)
    if (!ctx.ok) {
        return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const access = normalizeDashboardAccess(ctx.access)
    const employeeAccess = Boolean(ctx.user?.employeeAccess) || String(ctx.role || '').trim().toUpperCase() === 'EMPLOYEE'
    const hasAnyAssignedAccess = EMPLOYEE_MODULE_KEYS.some((key) => Boolean(access[key]))

    if (ctx.isAdmin) {
        return NextResponse.json({
            isAdmin: true,
            role: 'ADMIN',
            canViewDashboard: true,
            access: Object.fromEntries(Object.keys(access).map((key) => [key, true])),
            modules: MODULES,
        })
    }

    const modules = MODULES.filter((item) => Boolean(access[item.key]))

    return NextResponse.json({
        isAdmin: false,
        role: ctx.role,
        employeeAccess,
        canViewDashboard: employeeAccess || hasAnyAssignedAccess,
        access,
        modules,
    })
}
