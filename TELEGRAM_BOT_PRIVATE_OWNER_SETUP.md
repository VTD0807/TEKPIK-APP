# TEKPIK Private Admin Bot - Owner Only Setup

A complete guide to set up a **PRIVATE** Telegram bot that only YOU can use to manage TEKPIK products.

---

## ⚠️ IMPORTANT: Make Bot Private (Owner-Only)

By default, the bot is public. To make it **private** (owner-only):

### Step 1: Get Your Telegram User ID

**Method A: Using @userinfobot (Easiest)**
1. Open Telegram
2. Search for **@userinfobot**
3. Send it any message (or just `/start`)
4. It replies with your user ID (example: `1735428995`)
5. Copy this number

**Method B: Check Bot Logs**
1. Deploy bot and try to message it
2. Check server logs
3. Look for: `Unauthorized: user 123456789`
4. Copy that number

### Step 2: Add Owner ID to .env.local

Add to your `.env.local`:
```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_BOT_OWNER_ID=1735428995
```

Use your actual user ID. For your account, use `1735428995`.

### Step 3: Redeploy

After adding the owner ID:
1. Save `.env.local`
2. Redeploy to Vercel or restart local server
3. Try messaging bot - **you should have access**
4. Anyone else gets: `❌ Access Denied - This is a private bot`

---

## Admin Commands

Now that your bot is private, you can use admin commands:

### Default: Import Products
**Just send Amazon link:**
```
https://amazon.in/dp/B0ABCDEF1234
```
↓ Reply:
```
✅ Product Added!

Samsung Monitor

💰 Price: ₹14,999
📌 Original: ₹19,999
🏷️ Discount: 25%

📍 View on TEKPIK
```

### /help
Show all available commands

### /start
Welcome & quick start

### /stats
View import statistics:
- Total imports
- Success rate
- Recent imports
- Success/failure counts

### /list [n]
List last n imports (default: 10)
```
/list 20  → Shows last 20 imports
```

### /search [keyword]
Search products by title
```
/search Samsung  → Finds all Samsung products
```

### /update ASIN
Update an existing product's data from Amazon:
```
/update B0ABCDEF1234
```
Updates:
- Price
- Original price
- Discount percentage
- Images
- Description

### /info product_id
Get detailed product information
```
/info prod_123456789
```

### /delete product_id
Remove a product from database
```
/delete prod_123456789  → Removes product
```

---

## Features Included

✅ **Private/Owner-Only** - Only you can use  
✅ **Auto-Import** - Send Amazon link → auto-adds product  
✅ **Update Products** - Refresh price/images from Amazon  
✅ **Search** - Find products by title  
✅ **Statistics** - Track imports & success rate  
✅ **Admin Management** - Delete/update products  
✅ **Formatted Replies** - Product image + details  
✅ **Full Description** - Saves to website  
✅ **Audit Trail** - Logs all imports  

---

## Webhook Configuration

Same as before:

```bash
# Setup webhook
curl "http://localhost:3000/api/webhooks/telegram-import-bot?action=setup&webhookUrl=https://YOUR_DOMAIN/api/webhooks/telegram-import-bot"

# Check status
curl "http://localhost:3000/api/webhooks/telegram-import-bot?action=info"
```

---

## Environment Variables Summary

```env
# Bot configuration
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_BOT_OWNER_ID=1735428995  # Your Telegram user ID - REQUIRED for private bot!

# Firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tekpik-oqens-fbrtdx

# Site
NEXT_PUBLIC_SITE_URL=https://tekpik.in
```

---

## Admin Endpoints

### View Statistics
```bash
GET /api/admin/telegram-import-bot
```

Returns:
```json
{
  "stats": {
    "totalImports": 42,
    "successCount": 40,
    "successRate": 95
  },
  "recentImports": [...],
  "botToken": "configured",
  "botInfo": {...}
}
```

### Test Webhook
```bash
POST /api/admin/telegram-import-bot
{
  "action": "test-webhook",
  "webhookUrl": "https://yourdomain.com/api/webhooks/telegram-import-bot"
}
```

### Clear Import Logs
```bash
POST /api/admin/telegram-import-bot
{
  "action": "clear-logs"
}
```

---

## Troubleshooting

### "Access Denied" message
- Make sure you added `TELEGRAM_BOT_OWNER_ID` to `.env.local`
- Use your correct Telegram user ID
- Restart/redeploy after changing env vars

### Bot not responding
- Check webhook is set: `/api/webhooks/telegram-import-bot?action=info`
- Verify token is correct
- Check server logs for errors

### Can't find your user ID
- Use **@userinfobot** (easiest)
- Or check bot server logs when you message it

### Owner ID not working
1. Get correct ID with @userinfobot
2. Add to .env.local: `TELEGRAM_BOT_OWNER_ID=your_id`
3. Restart server
4. Hard refresh and try again

---

## Security

✅ Only bot owner can use  
✅ Unauthorized users get access denied  
✅ All imports logged  
✅ Database requires Firebase auth  
✅ Webhook validates Telegram requests  

---

## Database Changes

Imports are stored in `telegram_imports` collection:
```javascript
{
  chatId: "your_telegram_chat_id",
  userId: "your_telegram_user_id",
  productId: "prod_xxx",
  sourceUrl: "https://amazon.in/...",
  status: "success|failed|error",
  message: "Added: Product Title",
  createdAt: Timestamp
}
```

Only owner's messages are processed (others get access denied message).

---

## Complete Workflow

1. ✅ Bot created with @BotFather
2. ✅ Token added to `.env.local`
3. ✅ **Owner ID added to `.env.local` ← IMPORTANT**
4. ✅ Webhook configured
5. ✅ Bot deployed
6. ✅ Test message received
7. ✅ Use admin commands

---

## Support Files

- [TELEGRAM_BOT_BUILD_GUIDE.md](TELEGRAM_BOT_BUILD_GUIDE.md) - Full build guide
- [TELEGRAM_BOT_SETUP.md](TELEGRAM_BOT_SETUP.md) - Original setup guide
- `lib/telegram-bot-utils.js` - Helper functions
- `app/api/webhooks/telegram-import-bot/route.js` - Main bot code
- `app/api/admin/telegram-import-bot/route.js` - Admin stats

---

**Your bot is now private and ready to use! 🔐🤖**
