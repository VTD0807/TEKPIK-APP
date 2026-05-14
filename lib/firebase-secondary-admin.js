import { dbUsers, firebaseAdminStatus } from './firebase-admin'

// Export the Users DB (3rd DB) as the Secondary DB for price tracking
// This reuses the already configured Users database instead of requiring a 4th set of credentials.
export const dbSecondary = dbUsers

export const secondaryFirebaseAdminStatus = {
    ready: Boolean(dbSecondary),
    source: 'Linked to Users DB (3rd DB)',
    error: dbSecondary ? null : 'Users DB is not initialized',
}
