/**
 * Prisma client — only used if DATABASE_URL is set.
 * For Vercel/Supabase deployments, use lib/supabase-server.js instead.
 * This file is kept for local development with direct Postgres access.
 */

let prisma = null

if (process.env.DATABASE_URL && typeof window === 'undefined') {
    try {
        const { PrismaClient } = require('@prisma/client')
        const globalForPrisma = globalThis
        prisma = globalForPrisma.prisma ?? new PrismaClient()
        if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
    } catch {
        // Prisma not available — use Supabase client instead
    }
}

export { prisma }
