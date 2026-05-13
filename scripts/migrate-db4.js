const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const admin = require('firebase-admin');

async function run() {
    try {
        console.log('🚀 Starting DB-4 Migration (Workspace & Admin)...');

        // 1. Initialize Source App
        const sourceCredsStr = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!sourceCredsStr) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');
        const sourceCreds = JSON.parse(sourceCredsStr);
        const sourceApp = admin.initializeApp({ credential: admin.credential.cert(sourceCreds) }, 'source');
        const sourceDb = sourceApp.firestore();

        // 2. Initialize Dest App (DB-4)
        const destCredsStr = process.env.FIREBASE_WORKSPACE_SERVICE_ACCOUNT;
        if (!destCredsStr) throw new Error('Missing FIREBASE_WORKSPACE_SERVICE_ACCOUNT. Did you inject it into .env.local?');
        const destCreds = JSON.parse(destCredsStr);
        const destApp = admin.initializeApp({ credential: admin.credential.cert(destCreds) }, 'dest');
        const destDb = destApp.firestore();

        const collectionsToMigrate = [
            'mail_templates',
            'settings',
            'employee_logs',
            'work_assignments',
            'telegram_messages',
            'telegram_runs',
            'telegram_imports'
        ];

        for (const collection of collectionsToMigrate) {
            console.log(`\n📦 Starting migration for: ${collection}`);
            const snap = await sourceDb.collection(collection).get();
            if (snap.empty) {
                console.log(`   └─ No documents found in ${collection}. Skipping.`);
                continue;
            }

            console.log(`   └─ Found ${snap.size} documents. Copying...`);
            let count = 0;
            let batch = destDb.batch();
            let batchCount = 0;

            for (const doc of snap.docs) {
                const destRef = destDb.collection(collection).doc(doc.id);
                batch.set(destRef, doc.data());
                batchCount++;
                count++;

                if (batchCount >= 400) {
                    await batch.commit();
                    console.log(`      ... copied ${count} documents`);
                    batch = destDb.batch();
                    batchCount = 0;
                }
            }

            if (batchCount > 0) {
                await batch.commit();
            }

            console.log(`   ✅ Finished ${collection}: Total ${count} documents copied.`);
        }

        console.log('\n🎉 DB-4 Migration Completed Successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Migration Failed:', err);
        process.exit(1);
    }
}

run();
