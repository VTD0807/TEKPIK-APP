import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function PUT(req, { params }) {
    const { id } = await params
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        const body = await req.json()
        const name = (body.name || '').trim()
        const slug = (body.slug || '').trim().toLowerCase()

        if (!name || !slug) {
            return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
        }

        const allSnap = await dbAdmin.collection('categories').get()
        const duplicate = allSnap.docs.some(doc => {
            if (doc.id === id) return false
            const cat = doc.data()
            return (cat?.name || '').trim().toLowerCase() === name.toLowerCase() || (cat?.slug || '').trim().toLowerCase() === slug
        })

        if (duplicate) {
            return NextResponse.json({ error: 'Category with same name or slug already exists' }, { status: 409 })
        }

        await dbAdmin.collection('categories').doc(id).update({
            name,
            slug,
            icon: body.icon,
            description: body.description
        })

        const docSnap = await dbAdmin.collection('categories').doc(id).get()
        return NextResponse.json({ id: docSnap.id, ...docSnap.data() })
    } catch (error) {
         return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(req, { params }) {
    const { id } = await params
    if (!dbAdmin) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 })

    try {
        await dbAdmin.collection('categories').doc(id).delete()
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
