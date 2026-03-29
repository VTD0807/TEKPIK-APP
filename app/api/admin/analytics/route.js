import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient()

        const [
            { count: totalProducts },
            { count: pendingReviews },
            { count: totalWishlists },
            { count: analysedProducts },
        ] = await Promise.all([
            supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('is_approved', false),
            supabase.from('wishlists').select('*', { count: 'exact', head: true }),
            supabase.from('ai_analysis').select('*', { count: 'exact', head: true }),
        ])

        return NextResponse.json({
            totalProducts: totalProducts ?? 0,
            pendingReviews: pendingReviews ?? 0,
            wishlistSaves: totalWishlists ?? 0,
            aiCoverage: { analysed: analysedProducts ?? 0, total: totalProducts ?? 0 },
        })
    } catch (err) {
        console.error('[analytics]', err)
        return NextResponse.json({ totalProducts: 0, pendingReviews: 0, wishlistSaves: 0, aiCoverage: { analysed: 0, total: 0 } })
    }
}
