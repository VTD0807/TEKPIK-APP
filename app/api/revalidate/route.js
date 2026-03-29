import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

/**
 * POST /api/revalidate
 * Body: { secret: string, path: string }
 * Shared secret must match REVALIDATE_SECRET env var.
 */
export async function POST(req) {
    const { secret, path } = await req.json()

    if (secret !== process.env.REVALIDATE_SECRET) {
        return NextResponse.json({ message: 'Invalid secret' }, { status: 401 })
    }

    if (!path) {
        return NextResponse.json({ message: 'Missing path' }, { status: 400 })
    }

    revalidatePath(path)
    return NextResponse.json({ revalidated: true, path })
}
