/**
 * Firestore Migration Script
 * 
 * Usage:
 * 1. Place your old project's service account JSON at: scripts/old-service-account.json
 * 2. Place your new project's service account JSON at: scripts/new-service-account.json
 * 3. Run: node scripts/migrate-db.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 1. Load Credentials (from root directory)
const oldCredsPath = path.join(__dirname, '..', 'tekpik-oqens-fbrtdx-firebase-adminsdk-fbsvc-2f239414f9.json');
const newCredsPath = path.join(__dirname, '..', 'tekpik-fl-backup-firebase-adminsdk-fbsvc-a091f28957.json');

if (!fs.existsSync(oldCredsPath) || !fs.existsSync(newCredsPath)) {
    console.error('❌ Missing credentials! Make sure both JSON files are in the root folder.');
    process.exit(1);
}

const oldCreds = require(oldCredsPath);
const newCreds = require(newCredsPath);

// 2. Initialize Apps
const oldApp = admin.initializeApp({ credential: admin.credential.cert(oldCreds) }, 'oldApp');
const newApp = admin.initializeApp({ credential: admin.credential.cert(newCreds) }, 'newApp');

const oldDb = oldApp.firestore();
const newDb = newApp.firestore();

// Collections to migrate
const COLLECTIONS = [
    'categories',
    'products',
    'users',
    'wishlists',
    'reviews',
    'analytics_devices',
    'analytics_page_unique_visitors',
    'analytics_user_interest_vectors',
    'mail_audience_segments',
    'mail_templates'
];

async function migrateCollection(collectionName) {
    console.log(`\n📦 Starting migration for: ${collectionName}`);
    
    const snapshot = await oldDb.collection(collectionName).get();
    if (snapshot.empty) {
        console.log(`   └─ No documents found in ${collectionName}. Skipping.`);
        return;
    }

    console.log(`   └─ Found ${snapshot.size} documents. Copying...`);

    let count = 0;
    const batchSize = 100;
    let batch = newDb.batch();

    for (const doc of snapshot.docs) {
        const docRef = newDb.collection(collectionName).doc(doc.id);
        batch.set(docRef, doc.data());
        count++;

        if (count % batchSize === 0) {
            await batch.commit();
            console.log(`      ... copied ${count} documents`);
            batch = newDb.batch(); // Create new batch
        }
    }

    // Commit any remaining documents in the last batch
    if (count % batchSize !== 0) {
        await batch.commit();
    }

    console.log(`   ✅ Finished ${collectionName}: Total ${count} documents copied.`);
}

async function run() {
    console.log('🚀 Starting Database Migration...');
    
    for (const col of COLLECTIONS) {
        try {
            await migrateCollection(col);
        } catch (err) {
            console.error(`❌ Error migrating ${col}:`, err.message);
        }
    }

    console.log('\n🎉 Migration Complete!');
    process.exit(0);
}

run();
