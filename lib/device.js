const DEVICE_KEY = 'tekpik_device_id'

export const getDeviceId = () => {
    if (typeof window === 'undefined') return ''

    let id = localStorage.getItem(DEVICE_KEY)
    if (id) return id

    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        id = crypto.randomUUID()
    } else {
        id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    }

    localStorage.setItem(DEVICE_KEY, id)
    return id
}
