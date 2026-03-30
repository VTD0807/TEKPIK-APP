// Hardcoded admin emails — Firebase UID-based role check
const ADMIN_EMAILS = [
    'varshith.code@gmail.com',
    'varshithpaladugu07@gmail.com',
]

export function isAdminEmail(email) {
    if (!email) return false
    return ADMIN_EMAILS.includes(email.toLowerCase().trim())
}
