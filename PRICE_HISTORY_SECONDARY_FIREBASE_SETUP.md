# Price History Tracker (Secondary Firebase) Setup

This module stores daily product price snapshots in a second Firebase project.

## What Is Already Built

- Admin page: `/admin/price-history`
- Admin API: `/api/admin/price-history`
- Daily cron endpoint: `/api/cron/price-history-sync`
- Secondary Firebase initializer: `lib/firebase-secondary-admin.js`
- Sync engine and chart data service: `lib/price-history-tracker.js`

## Required Credentials (Server)

You must provide a **service account** for the second Firebase project (`pricetrack-tekpik`).

Use one of these env options:

- `SECONDARY_FIREBASE_SERVICE_ACCOUNT` (raw JSON string)
- `SECONDARY_FIREBASE_SERVICE_ACCOUNT_BASE64` (base64 encoded JSON)
- `SECONDARY_GOOGLE_APPLICATION_CREDENTIALS_JSON` (raw JSON string)

OR key-pair style:

- `SECONDARY_FIREBASE_PROJECT_ID`
- `SECONDARY_FIREBASE_CLIENT_EMAIL`
- `SECONDARY_FIREBASE_PRIVATE_KEY`

## Your Secondary Project Reference

From your shared web config:

- projectId: `pricetrack-tekpik`
- authDomain: `pricetrack-tekpik.firebaseapp.com`

Important: web config alone is not enough for server-side Admin SDK writes.

## Daily Peak Sync

`vercel.json` includes:

- `/api/cron/price-history-sync` at `30 15 * * *` (15:30 UTC = 21:00 IST)

The module also checks configured peak time in settings and can skip outside window.

## Firestore Collections in Secondary DB

- `product_price_logs`
  - document id: `${dayKey}__${productId}`
  - fields: `dayKey`, `capturedAt`, `productId`, `title`, `price`, `originalPrice`, `discount`, `imageUrl`, etc.
- `price_sync_runs`
  - sync run logs and counts

## How To Enable

1. Add secondary service account env variables.
2. Deploy/restart app.
3. Open `/admin/price-history`.
4. Check status cards show secondary DB connected.
5. Enable tracker and save settings.
6. Run `Sync Now` once to seed first chart points.

## Notes

- Chart supports 30/60/90 day ranges.
- Main product source remains your primary Firebase `products` collection.
- Secondary DB is write-only for historical logs in this module.
