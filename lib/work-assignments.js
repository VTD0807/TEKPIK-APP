export const WORK_STATUS_OPTIONS = ['NOT_STARTED', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'BLOCKED']

export const WORK_TYPE_OPTIONS = [
    'PRODUCT_RESEARCH',
    'REVIEW_WRITING',
    'DATA_ENTRY',
    'CONTENT',
    'SEO_OPTIMIZATION',
    'PRICE_AUDIT',
    'BUG_FIX',
    'CUSTOMER_SUPPORT',
    'CAMPAIGN',
    'QA_VALIDATION',
    'OTHER',
]

export const WORK_PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

export const WORK_MODULE_OPTIONS = [
    'PRODUCTS',
    'REVIEWS',
    'ANALYTICS',
    'USERS',
    'EMPLOYEES',
    'NOTIFICATIONS',
    'SETTINGS',
    'STORE',
    'CMS',
    'GENERAL',
]

export const WORK_ASSIGNMENT_KIND_OPTIONS = ['ONE_TIME', 'RECURRING', 'MILESTONE', 'QUALITY_GATE', 'BUGFIX']

export const AUTO_TRACK_METRIC_OPTIONS = ['PRODUCTS_ADDED', 'REVIEWS_SUBMITTED', 'REVIEWS_APPROVED', 'TOTAL_CLICKS', 'TOTAL_IMPRESSIONS']

const EMPLOYEE_ROLES = new Set(['EMPLOYEE', 'MANAGER', 'EDITOR', 'SUPPORT'])

export function normalizeStatus(value, fallback = 'NOT_STARTED') {
    const normalized = String(value || '').trim().toUpperCase()
    return WORK_STATUS_OPTIONS.includes(normalized) ? normalized : fallback
}

export function normalizeType(value, fallback = 'OTHER') {
    const normalized = String(value || '').trim().toUpperCase()
    return WORK_TYPE_OPTIONS.includes(normalized) ? normalized : fallback
}

export function normalizePriority(value, fallback = 'MEDIUM') {
    const normalized = String(value || '').trim().toUpperCase()
    return WORK_PRIORITY_OPTIONS.includes(normalized) ? normalized : fallback
}

export function normalizeModule(value, fallback = 'GENERAL') {
    const normalized = String(value || '').trim().toUpperCase()
    return WORK_MODULE_OPTIONS.includes(normalized) ? normalized : fallback
}

export function normalizeAssignmentKind(value, fallback = 'ONE_TIME') {
    const normalized = String(value || '').trim().toUpperCase()
    return WORK_ASSIGNMENT_KIND_OPTIONS.includes(normalized) ? normalized : fallback
}

export function normalizeAutoMetric(value, fallback = 'PRODUCTS_ADDED') {
    const normalized = String(value || '').trim().toUpperCase()
    return AUTO_TRACK_METRIC_OPTIONS.includes(normalized) ? normalized : fallback
}

export function clampProgress(value, fallback = 0) {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return fallback
    return Math.max(0, Math.min(100, Math.round(numeric)))
}

export function parseOptionalDate(value) {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date
}

export function normalizeText(value, maxLength = 1000) {
    if (value == null) return ''
    return String(value).trim().slice(0, maxLength)
}

export function normalizeChecklist(value) {
    const list = Array.isArray(value) ? value : []
    return list
        .map((item, index) => {
            if (typeof item === 'string') {
                return {
                    id: `item-${index + 1}`,
                    title: normalizeText(item, 180),
                    done: false,
                    doneAt: null,
                }
            }
            return {
                id: normalizeText(item?.id, 64) || `item-${index + 1}`,
                title: normalizeText(item?.title, 180),
                done: Boolean(item?.done),
                doneAt: item?.doneAt || null,
            }
        })
        .filter((item) => Boolean(item.title))
        .slice(0, 50)
}

export function checklistProgressPercent(list) {
    const items = normalizeChecklist(list)
    if (items.length === 0) return 0
    const doneCount = items.filter((item) => item.done).length
    return clampProgress((doneCount / items.length) * 100)
}

export async function getEmployeeMetricSnapshot(dbAdmin, employeeId) {
    const productsSnap = await dbAdmin.collection('products').where('createdBy', '==', employeeId).limit(500).get().catch(() => ({ docs: [] }))
    const reviewsSnap = await dbAdmin.collection('reviews').where('userId', '==', employeeId).limit(500).get().catch(() => ({ docs: [] }))

    const productIds = productsSnap.docs.map((doc) => doc.id)
    const productViewCounts = {}
    if (productIds.length > 0) {
        const refs = productIds.map((id) => dbAdmin.collection('analytics_product_view_counts').doc(id))
        const chunkSize = 100
        for (let i = 0; i < refs.length; i += chunkSize) {
            const docs = await dbAdmin.getAll(...refs.slice(i, i + chunkSize))
            docs.forEach((doc) => {
                if (doc.exists) {
                    const data = doc.data() || {}
                    productViewCounts[doc.id] = Number(data.uniqueDeviceViews || 0)
                }
            })
        }
    }

    let clickCount = 0
    if (productIds.length > 0) {
        const chunkSize = 10
        for (let i = 0; i < productIds.length; i += chunkSize) {
            const batchIds = productIds.slice(i, i + chunkSize)
            const interactionsSnap = await dbAdmin
                .collection('analytics_product_interactions')
                .where('productId', 'in', batchIds)
                .limit(1000)
                .get()
                .catch(() => null)
            if (!interactionsSnap) continue
            interactionsSnap.forEach((doc) => {
                const data = doc.data() || {}
                if (data.eventType === 'product_click' || data.eventType === 'amazon_click') {
                    clickCount += 1
                }
            })
        }
    }

    return {
        PRODUCTS_ADDED: productsSnap.docs.length,
        REVIEWS_SUBMITTED: reviewsSnap.docs.length,
        REVIEWS_APPROVED: reviewsSnap.docs.filter((doc) => Boolean((doc.data() || {}).isApproved)).length,
        TOTAL_CLICKS: clickCount,
        TOTAL_IMPRESSIONS: Object.values(productViewCounts).reduce((sum, item) => sum + item, 0),
    }
}

export function buildAutoTracking(value, metrics) {
    const source = value && typeof value === 'object' ? value : {}
    const enabled = Boolean(source.enabled)
    const metric = normalizeAutoMetric(source.metric, 'PRODUCTS_ADDED')
    const baselineValue = Math.max(0, Number(source.baselineValue) || 0)
    const targetValue = Math.max(1, Number(source.targetValue) || 1)
    const currentAbsolute = Number(metrics?.[metric] || 0)
    const currentDelta = Math.max(0, currentAbsolute - baselineValue)
    const progressPercent = clampProgress((currentDelta / targetValue) * 100)

    return {
        enabled,
        metric,
        baselineValue,
        targetValue,
        currentValue: currentDelta,
        currentAbsolute,
        progressPercent,
        updatedAt: new Date(),
    }
}

function normalizeStoredAutoTracking(value) {
    const source = value && typeof value === 'object' ? value : {}
    if (!Boolean(source.enabled)) return {
        enabled: false,
        metric: normalizeAutoMetric(source.metric, 'PRODUCTS_ADDED'),
        baselineValue: Math.max(0, Number(source.baselineValue) || 0),
        targetValue: Math.max(1, Number(source.targetValue) || 1),
        currentValue: 0,
        currentAbsolute: 0,
        progressPercent: 0,
        updatedAt: source.updatedAt || null,
    }

    const hasComputedFields = source.currentValue !== undefined || source.currentAbsolute !== undefined || source.progressPercent !== undefined
    if (hasComputedFields) {
        return {
            enabled: true,
            metric: normalizeAutoMetric(source.metric, 'PRODUCTS_ADDED'),
            baselineValue: Math.max(0, Number(source.baselineValue) || 0),
            targetValue: Math.max(1, Number(source.targetValue) || 1),
            currentValue: Math.max(0, Number(source.currentValue) || 0),
            currentAbsolute: Math.max(0, Number(source.currentAbsolute) || 0),
            progressPercent: clampProgress(source.progressPercent),
            updatedAt: source.updatedAt || null,
        }
    }

    return buildAutoTracking(source, null)
}

export function isOverdueAssignment(data) {
    const dueDate = data?.dueDate
    if (!dueDate) return false
    const due = new Date(dueDate)
    if (Number.isNaN(due.getTime())) return false
    const status = normalizeStatus(data?.status)
    if (status === 'COMPLETED') return false
    return due.getTime() < Date.now()
}

export function canUseEmployeeWorkspace(ctx) {
    if (!ctx?.ok) return false
    if (ctx.isAdmin) return true

    const role = String(ctx.role || '').trim().toUpperCase()
    if (EMPLOYEE_ROLES.has(role)) return true

    if (Boolean(ctx.user?.employeeAccess)) return true

    const access = ctx.access && typeof ctx.access === 'object' ? ctx.access : {}
    return Object.values(access).some(Boolean)
}

export function serializeWorkAssignment(docId, data, timestampToJSON) {
    const toJson = (value) => (value ? timestampToJSON(value) : null)
    const statusHistory = Array.isArray(data?.statusHistory) ? data.statusHistory : []
    const checklist = normalizeChecklist(data?.checklist)
    const autoTracking = normalizeStoredAutoTracking(data?.autoTracking)
    const recurrence = data?.recurrence && typeof data?.recurrence === 'object' ? data.recurrence : {}

    return {
        id: docId,
        title: data?.title || '',
        description: data?.description || '',
        status: normalizeStatus(data?.status),
        workType: normalizeType(data?.workType),
        module: normalizeModule(data?.module),
        assignmentKind: normalizeAssignmentKind(data?.assignmentKind),
        priority: normalizePriority(data?.priority),
        progressPercent: clampProgress(data?.progressPercent),
        estimatedHours: Math.max(0, Number(data?.estimatedHours) || 0),
        complexity: Math.max(1, Math.min(5, Number(data?.complexity) || 1)),
        employeeId: data?.employeeId || '',
        employeeName: data?.employeeName || '',
        employeeEmail: data?.employeeEmail || '',
        assignedById: data?.assignedById || '',
        assignedByName: data?.assignedByName || '',
        assignedByEmail: data?.assignedByEmail || '',
        dueDate: toJson(data?.dueDate),
        startedAt: toJson(data?.startedAt),
        completedAt: toJson(data?.completedAt),
        createdAt: toJson(data?.createdAt),
        updatedAt: toJson(data?.updatedAt),
        notes: data?.notes || '',
        checklist,
        checklistProgressPercent: checklistProgressPercent(checklist),
        recurrence: {
            enabled: Boolean(recurrence.enabled),
            everyDays: Math.max(1, Number(recurrence.everyDays) || 1),
            nextDueAt: toJson(recurrence.nextDueAt),
        },
        autoTracking,
        isOverdue: isOverdueAssignment({ dueDate: toJson(data?.dueDate), status: data?.status }),
        statusHistory: statusHistory.map((item) => ({
            status: normalizeStatus(item?.status),
            at: toJson(item?.at),
            byId: item?.byId || '',
            byName: item?.byName || '',
            note: item?.note || '',
            progressPercent: clampProgress(item?.progressPercent, 0),
        })),
    }
}
