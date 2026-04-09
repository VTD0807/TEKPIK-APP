# Telegram Import Bot - Complete Build Guide

A complete guide to build and deploy your Telegram bot for TEKPIK that auto-imports Amazon products.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Create Telegram Bot](#step-1-create-telegram-bot)
4. [Step 2: Configure Environment](#step-2-configure-environment)
5. [Step 3: Implement Webhook Endpoint](#step-3-implement-webhook-endpoint)
6. [Step 4: Deploy & Test](#step-4-deploy--test)
7. [Step 5: Advanced Features](#step-5-advanced-features)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This Telegram bot:
- ✅ Accepts Amazon product links from users
- ✅ Scrapes product data from Amazon
- ✅ Automatically adds products to TEKPIK database
- ✅ Replies with formatted product summary (price, discount, image)
- ✅ Stores full description on the website
- ✅ Tracks all imports in Firestore
- ✅ Notifies admins of new products

**Tech Stack:**
- Telegram Bot API (webhooks)
- Next.js API Routes
- Firebase Firestore
- Amazon Web Scraper

---

## Prerequisites

- ✅ TEKPIK app already running
- ✅ Firebase project configured
- ✅ Amazon scraper working (we fixed this earlier)
- ✅ Node.js and npm installed
- ✅ tekpik.in domain configured in production

---

## Step 1: Create Telegram Bot

### 1.1 Open BotFather

1. Open **Telegram** app or web (web.telegram.org)
2. Search for **@BotFather** (official Telegram bot manager)
3. Click "Start" or send `/start`

### 1.2 Create New Bot

Send the command:
```
/newbot
```

BotFather will ask:
```
Alright, a new bot. How are we going to call it? 
Please choose a name for your bot.
```

**Reply with:** `TEKPIK Import Bot` (or your preferred name)

Then it asks:
```
Good. Now let's choose a username for your bot. 
It must end in `bot`. For example, TetrisBot or tetris_bot.
```

**Reply with:** `tekpik_import_bot` (must be unique)

### 1.3 Copy Bot Token

BotFather will respond:
```
Done! Congratulations on your new bot. You will find it at t.me/tekpik_import_bot. 
You can now add a description, about section and profile picture for your bot. 
See /help for a list of commands.

Use this token to access the HTTP API:
123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

**⚠️ Save the token!** You'll need it.

### 1.4 Optional: Set Bot Commands

This makes commands visible to users. Send:

```
/setcommands
```

BotFather asks for the commands. Send exactly:
```
start - Get started with importing products
help - Show usage instructions  
status - View your imports
```

---

## Step 2: Configure Environment

### 2.1 Add Token to .env.local

Open your `.env.local` file and add:

```env
# Telegram Import Bot
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

Replace with your actual token from BotFather.

### 2.2 Verify Other Required Env Vars

Check you have these (should already exist):
```env
# Firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tekpik-oqens-fbrtdx

# Amazon Scraper (uses existing scraper)
NEXT_PUBLIC_SITE_URL=https://tekpik.in
```

---

## Step 3: Implement Webhook Endpoint

### 3.1 Create Webhook Route

The webhook receives messages from Telegram. We've already created these files:

**File Structure:**
```
app/
  api/
    webhooks/
      telegram-import-bot/
        route.js          ← Main webhook (POST to receive messages)
    admin/
      telegram-import-bot/
        route.js          ← Admin stats & management
lib/
  telegram-bot-utils.js   ← Helper functions
```

### 3.2 How the Webhook Works

**Flow:**
```
User sends message to @tekpik_import_bot
            ↓
Telegram API sends POST to your webhook
            ↓
Your Next.js endpoint receives message
            ↓
Extract URL from message
            ↓
Validate it's an Amazon link
            ↓
Scrape product with amazon-scraper library
            ↓
Save to Firestore products collection
            ↓
Format and send reply with photo/text
            ↓
Log import to telegram_imports collection
```

### 3.3 Webhook Code (Already Implemented)

**File:** `app/api/webhooks/telegram-import-bot/route.js`

**Key handlers:**

```javascript
POST /api/webhooks/telegram-import-bot
  ├─ Receives Telegram updates
  ├─ Extracts URL from message
  ├─ Validates Amazon URL
  ├─ Scrapes product
  ├─ Saves to Firestore
  └─ Sends formatted reply

GET /api/webhooks/telegram-import-bot?action=info
  └─ Check webhook status

GET /api/webhooks/telegram-import-bot?action=setup&webhookUrl=YOUR_URL
  └─ Register webhook with Telegram
```

---

## Step 4: Deploy & Test

### 4.1 Deployment Testing

Use your production domain on Vercel for all webhook testing.

### 4.2 Set Webhook URL

Use your production URL:

**Using curl:**
```bash
curl "https://tekpik.in/api/webhooks/telegram-import-bot?action=setup&webhookUrl=https://tekpik.in/api/webhooks/telegram-import-bot"
```

Or **POST to admin endpoint:**
```bash
curl -X POST https://tekpik.in/api/admin/telegram-import-bot \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test-webhook",
    "webhookUrl": "https://tekpik.in/api/webhooks/telegram-import-bot"
  }'
```

### 4.3 Verify Webhook is Set

```bash
curl "https://tekpik.in/api/webhooks/telegram-import-bot?action=info"
```

You should see:
```json
{
  "ok": true,
  "result": {
    "url": "https://xxxxx.ngrok.io/api/webhooks/telegram-import-bot",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### 4.4 Test with Your Bot

1. Open Telegram and find **@tekpik_import_bot**
2. Send `/start`
3. Bot replies with welcome message
4. Send an Amazon link:
   ```
   https://amazon.in/dp/B0ABCDEF1234
   ```
5. Bot should:
   - Show "⏳ Processing..."
   - Ask for permission if needed
   - Reply with product image + info
   - Product appears in CMS

---

## Step 5: Advanced Features

### 5.1 Admin Stats Endpoint

**GET** `/api/admin/telegram-import-bot`

Returns:
```json
{
  "stats": {
    "totalImports": 42,
    "successCount": 40,
    "failedCount": 1,
    "errorCount": 1,
    "successRate": 95
  },
  "recentImports": [
    {
      "id": "...",
      "sourceUrl": "https://amazon.in/...",
      "productId": "prod_xxx",
      "status": "success",
      "createdAt": "2026-04-09T10:30:00Z"
    }
  ]
}
```

### 5.2 Admin Management

**POST** `/api/admin/telegram-import-bot`

Clear logs:
```bash
curl -X POST https://tekpik.in/api/admin/telegram-import-bot \
  -H "Content-Type: application/json" \
  -d '{ "action": "clear-logs" }'
```

Update webhook:
```bash
curl -X POST https://tekpik.in/api/admin/telegram-import-bot \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test-webhook",
    "webhookUrl": "https://yourdomain.com/api/webhooks/telegram-import-bot"
  }'
```

### 5.3 Notification to Admins

When a product is imported, admins get notified:
```
📦 New Product Imported
Samsung 24-inch Monitor added via Telegram (@username)
```

This notification appears in:
- OneSignal (web push)
- In-app notifications
- Telegram (if admin bot configured)

### 5.4 Custom Reply Format

Modify `lib/telegram-bot-utils.js` function `formatProductReply()` to customize the message.

**Current format:**
```
✅ Product Added!

Bold Product Title

💰 Price: ₹14,999
📌 Original: ₹19,999
🏷️ Discount: 25%
🔗 ASIN: B0ABCDEF

📍 View on TEKPIK
```

---

## Step 6: Production Deployment

### 6.1 Deploy to Vercel

```bash
vercel deploy
```

### 6.2 Set Environment Variables on Vercel

1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Add:
   ```
   TELEGRAM_BOT_TOKEN=your_token_here
   NEXT_PUBLIC_SITE_URL=https://tekpik.in
   ```

### 6.3 Update Webhook URL

Use the production URL:

```bash
curl "https://tekpik.in/api/webhooks/telegram-import-bot?action=setup&webhookUrl=https://tekpik.in/api/webhooks/telegram-import-bot"
```

### 6.4 Optional: Add Admin Commands in BotFather

Send to BotFather:
```
/mybotinline
```

This allows admins to access `/api/admin/telegram-import-bot` easily.

---

## Troubleshooting

### Issue: "Bot doesn't respond"

**Check:**
1. Token is correct: `echo $TELEGRAM_BOT_TOKEN`
2. Webhook is set: `/api/webhooks/telegram-import-bot?action=info`
3. Webhook URL is HTTPS
4. Firestore is accessible: check logs

**Fix:**
```bash
# Re-register webhook
curl "https://tekpik.in/api/webhooks/telegram-import-bot?action=setup&webhookUrl=https://tekpik.in/api/webhooks/telegram-import-bot"
```

### Issue: "Cannot fetch product"

**Cause:** Amazon page not scrapable or invalid URL

**Check:**
1. URL opens in browser manually
2. It's an actual Amazon product page
3. Not a regional restriction issue

**Fix:** Improve error message or try different scraper selectors

### Issue: "Product not saved to Firestore"

**Check:**
1. Firebase credentials in `.env.local`
2. Firestore database is accessible
3. `products` collection exists
4. Check logs: `/api/admin/telegram-import-bot?limit=20`

### Issue: "Image not showing in reply"

**Cause:** Amazon image URL not accessible from server

**Fix:** Bot will still send text reply, no image

---

## Database Collections

### `telegram_imports` Schema

```javascript
{
  chatId: "123456789",          // Telegram chat ID
  userId: "987654321",          // Telegram user ID
  productId: "prod_xxx",        // Generated product ID
  sourceUrl: "https://...",     // Original Amazon URL
  status: "success|failed|error",
  message: "Added: Product Title",
  createdAt: Timestamp          // Import timestamp
}
```

Query imports:
```javascript
// Get user's imports
db.collection('telegram_imports')
  .where('userId', '==', userId)
  .orderBy('createdAt', 'desc')
  .get()
```

---

## Security Considerations

1. **Validate Telegram requests** - Verify `x-telegram-auth` header
2. **Rate limit** - Prevent spam imports from single user
3. **URL validation** - Only accept Amazon URLs
4. **Firestore rules** - Restrict who can read import history
5. **Admin notifications** - Only notify admins (role: 'ADMIN')

**Example Firestore rule:**
```javascript
match /telegram_imports/{document=**} {
  allow read: if request.auth.token.admin == true;
  allow write: if request.auth == null;  // Public write (webhook)
}

match /admin_notifications/{document=**} {
  allow read: if request.auth.token.admin == true;
  allow write: if request.auth.token.admin == true;
}
```

---

## Monitoring & Analytics

### Track Bot Usage

**Endpoint:** `GET /api/admin/telegram-import-bot`

Shows:
- Total imports
- Success/failure rate
- Most recent imports
- User activity

### Log Download

Get import logs as JSON:
```bash
curl https://tekpik.in/api/admin/telegram-import-bot > imports.json
```

---

## Complete Checklist

- [ ] BotFather bot created
- [ ] Bot token copied to `.env.local`
- [ ] Webhook endpoint implemented
- [ ] Webhook URL configured
- [ ] Test message sent & received
- [ ] Product saved to Firestore
- [ ] Admin notification working
- [ ] Stats endpoint returning data
- [ ] Deployed to production
- [ ] Production webhook URL set
- [ ] Admin commands configured

---

## Files Reference

| File | Purpose |
|------|---------|
| `lib/telegram-bot-utils.js` | Send messages, format replies, logging |
| `app/api/webhooks/telegram-import-bot/route.js` | Main webhook & setup |
| `app/api/admin/telegram-import-bot/route.js` | Stats & management |
| `lib/amazon-scraper.js` | Existing scraper (no changes needed) |
| `.env.local` | Store `TELEGRAM_BOT_TOKEN` |

---

## Next Steps

1. ✅ Follow steps 1-4 above
2. Test the bot with sample Amazon links
3. Monitor imports in `/api/admin/telegram-import-bot`
4. Customize messages as needed
5. Deploy to production
6. Create admin dashboard to view imports

---

## Support Commands

**For debugging:**
- `GET /api/admin/onesignal-diagnostic` - Check OneSignal status
- `GET /api/admin/telegram-import-bot?limit=50` - View last 50 imports
- `POST /api/admin/test-notifications` - Send test notification
- `GET /api/webhooks/telegram-import-bot?action=info` - Check webhook

**Documentation files:**
- `TELEGRAM_BOT_SETUP.md` - Bot setup (already created)
- `ONESIGNAL_SETUP.md` - OneSignal setup

---

Still have questions? Check the code in:
- `app/api/webhooks/telegram-import-bot/route.js` - Full implementation
- `lib/telegram-bot-utils.js` - All helper functions
