import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import admin from 'firebase-admin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const serviceAccountPath = path.join(projectRoot, 'tekpik-oqens-fbrtdx-firebase-adminsdk-fbsvc-2f239414f9.json')

const essentialCategories = [
    {
        id: 'smartphones',
        name: 'Smartphones',
        slug: 'smartphones',
        icon: '📱',
        description: 'Phones, iPhones, Android devices, and flagship models.',
    },
    {
        id: 'laptops',
        name: 'Laptops',
        slug: 'laptops',
        icon: '💻',
        description: 'Laptops, notebooks, ultrabooks, and work machines.',
    },
    {
        id: 'audio',
        name: 'Audio',
        slug: 'audio',
        icon: '🎧',
        description: 'Headphones, earbuds, speakers, soundbars, and mics.',
    },
    {
        id: 'tv-home-entertainment',
        name: 'TV & Home Entertainment',
        slug: 'tv-home-entertainment',
        icon: '📺',
        description: 'Televisions, streaming devices, projectors, and media gear.',
    },
    {
        id: 'home-appliances',
        name: 'Home Appliances',
        slug: 'home-appliances',
        icon: '🧺',
        description: 'Daily-use appliances for home, cleaning, and comfort.',
    },
    {
        id: 'kitchen-dining',
        name: 'Kitchen & Dining',
        slug: 'kitchen-dining',
        icon: '🍳',
        description: 'Kitchen appliances, cookware, and dining essentials.',
    },
    {
        id: 'wearables',
        name: 'Wearables',
        slug: 'wearables',
        icon: '⌚',
        description: 'Smartwatches, fitness trackers, and wearable tech.',
    },
    {
        id: 'gaming',
        name: 'Gaming',
        slug: 'gaming',
        icon: '🎮',
        description: 'Consoles, controllers, accessories, and gaming gear.',
    },
    {
        id: 'cameras',
        name: 'Cameras',
        slug: 'cameras',
        icon: '📷',
        description: 'Cameras, lenses, tripods, and creator equipment.',
    },
    {
        id: 'accessories',
        name: 'Accessories',
        slug: 'accessories',
        icon: '🔌',
        description: 'Chargers, cables, cases, stands, and useful add-ons.',
    },
    {
        id: 'storage',
        name: 'Storage',
        slug: 'storage',
        icon: '💾',
        description: 'SSD, HDD, flash drives, memory cards, and backup gear.',
    },
    {
        id: 'tablets',
        name: 'Tablets',
        slug: 'tablets',
        icon: '🖊️',
        description: 'Tablets, iPads, note-taking devices, and portable screens.',
    },
]

const initAdmin = () => {
    if (admin.apps.length) return admin.app()

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    }

    if (process.env.FIREBASE_PRIVATE_KEY) {
        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        })
    }

    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
        return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    }

    throw new Error('Missing Firebase Admin credentials')
}

const run = async () => {
    initAdmin()
    const db = admin.firestore()
    const batch = db.batch()

    essentialCategories.forEach((category) => {
        const ref = db.collection('categories').doc(category.id)
        batch.set(ref, {
            name: category.name,
            slug: category.slug,
            icon: category.icon,
            description: category.description,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true })
    })

    await batch.commit()
    console.log(`Seeded ${essentialCategories.length} essential categories.`)
}

run().catch((error) => {
    console.error('Category seed failed:', error)
    process.exit(1)
})
