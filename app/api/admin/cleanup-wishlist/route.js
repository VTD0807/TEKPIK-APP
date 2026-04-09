import { NextResponse } from 'next/server'
import { dbAdmin, authAdmin } from '@/lib/firebase-admin'

// Admin-only endpoint to cleanup duplicate wishlists
export async function POST(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await authAdmin.verifyIdToken(authHeader.split('Bearer ')[1])
        
        // Verify user is admin (check custom claims or admin list)
        // You'll need to implement this check based on your admin setup
        const userDoc = await dbAdmin.collection('users').doc(user.uid).get()
        if (!userDoc.data()?.isAdmin) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        // Get ALL wishlist entries
        const snap = await dbAdmin.collection('wishlists').get()
        
        const userWishlists = {}
        const duplicateDocs = []
        
        // Group by userId+productId and find duplicates
        snap.forEach(doc => {
            const { userId, productId } = doc.data()
            const key = `${userId}|${productId}`
            
            if (!userWishlists[key]) {
                userWishlists[key] = []
            }
            userWishlists[key].push(doc.id)
        })

        // Mark all but first entry as duplicate
        Object.values(userWishlists).forEach(docs => {
            if (docs.length > 1) {
                duplicateDocs.push(...docs.slice(1)) // Keep first, delete rest
            }
        })

        // Delete duplicates
        let deleted = 0
        for (const docId of duplicateDocs) {
            await dbAdmin.collection('wishlists').doc(docId).delete()
            deleted++
        }

        return NextResponse.json({ 
            message: `Cleanup completed: found ${duplicateDocs.length} duplicates, deleted ${deleted}`,
            totalDuplicates: duplicateDocs.length,
            deleted
        })
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

// GET to check for duplicates without deleting
export async function GET(req) {
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await authAdmin.verifyIdToken(authHeader.split('Bearer ')[1])
        
        // Verify user is admin
        const userDoc = await dbAdmin.collection('users').doc(user.uid).get()
        if (!userDoc.data()?.isAdmin) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        // Get ALL wishlist entries
        const snap = await dbAdmin.collection('wishlists').get()
        
        const userWishlists = {}
        let duplicatesCount = 0
        
        // Group by userId+productId
        snap.forEach(doc => {
            const { userId, productId } = doc.data()
            const key = `${userId}|${productId}`
            
            if (!userWishlists[key]) {
                userWishlists[key] = []
            }
            userWishlists[key].push({ docId: doc.id, data: doc.data() })
        })

        // Find duplicates
        const duplicatesByUser = {}
        Object.entries(userWishlists).forEach(([key, docs]) => {
            if (docs.length > 1) {
                const [userId] = key.split('|')
                if (!duplicatesByUser[userId]) duplicatesByUser[userId] = []
                duplicatesByUser[userId].push(...docs)
                duplicatesCount += docs.length - 1
            }
        })

        return NextResponse.json({ 
            message: `Found ${duplicatesCount} duplicate wishlist entries`,
            totalEntries: snap.size,
            totalDuplicates: duplicatesCount,
            duplicatesByUser: Object.keys(duplicatesByUser).length,
            details: duplicatesByUser
        })
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
