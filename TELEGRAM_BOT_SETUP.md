# Telegram Import Bot Setup Guide

This Telegram bot allows users to send Amazon product links directly to a Telegram bot, and it automatically:
1. ✅ Scrapes the product from Amazon
2. ✅ Adds it to TEKPIK database
3. ✅ Replies with formatted product details
4. ✅ Stores full description on the website

## Quick Setup (5 minutes)

### 1. Create a Telegram Bot with BotFather

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Follow the prompts:
   - **Name:** `TEKPIK Import Bot` (or your choice)
   - **Username:** `tekpik_import_bot` (must be unique)
4. Copy the **API Token** (looks like: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
5. Click the token link to open your bot's settings

### 2. Add Bot Token to Environment

Add to `.env.local`:
```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
```

### 3. Set Webhook URL

Replace `WEBHOOK_URL` with your production URL:
```bash
curl "http://localhost:3000/api/webhooks/telegram-import-bot?action=setup&webhookUrl=https://yourdomain.com/api/webhooks/telegram-import-bot"
```

Or use the admin endpoint:
```bash
POST http://localhost:3000/api/admin/telegram-import-bot
{
  "action": "test-webhook",
  "webhookUrl": "https://yourdomain.com/api/webhooks/telegram-import-bot"
}
```

### 4. Check Webhook Status

```bash
curl "http://localhost:3000/api/webhooks/telegram-import-bot?action=info"
```

---

## How It Works

### User Flow

```
User → Sends Amazon Link → Telegram Bot
                                ↓
                         Validates URL
                                ↓
                      Scrapes Amazon
                                ↓
                      Adds to Database
                                ↓
                      Sends Reply with:
                      • Product Image
                      • Title
                      • Original Price
                      • Current Price
                      • Discount %
                      • TEKPIK Link
```

### Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Show welcome message and instructions |
| `/help` | Show help text |
| `/status` | View your import statistics |

### Supported Link Formats

- Full Amazon URLs: `https://amazon.in/dp/B0123456789`
- Amazon short links: `https://amzn.to/3x4Y2z1`
- Mobile links: `https://m.amazon.in/dp/B0123456789`

---

## API Endpoints

### Webhook Endpoint
**POST** `/api/webhooks/telegram-import-bot`
- Receives all Telegram updates
- Process product links
- Send replies

**GET** `/api/webhooks/telegram-import-bot?action=info`
- Check webhook status

**GET** `/api/webhooks/telegram-import-bot?action=setup&webhookUrl=YOUR_URL`
- Set or update webhook URL

### Admin Endpoint
**GET** `/api/admin/telegram-import-bot`
- View import statistics
- View recent imports
- Check bot info

**POST** `/api/admin/telegram-import-bot`
- `action: "test-webhook"` - Test webhook setup
- `action: "clear-logs"` - Clear import history

---

## Response Format

When a user sends a link, the bot replies with:

```
✅ Product Added!

Bold Product Title Here

💰 Price: ₹4,999
📌 Original: ₹9,999
🏷️ Discount: 50%
🔗 ASIN: B0123456789

📍 View on TEKPIK
```

---

## Database Collections

### `telegram_imports`
Stores all import attempts:
```javascript
{
  chatId: "123456789",
  userId: "987654321",
  productId: "prod_xxx",
  sourceUrl: "https://amazon.in/dp/xxx",
  status: "success|failed|error",
  message: "Added: Product Title",
  createdAt: Timestamp
}
```

---

## Troubleshooting

### Bot not responding
1. Check `TELEGRAM_BOT_TOKEN` is set in `.env.local`
2. Verify webhook URL with: `/api/webhooks/telegram-import-bot?action=info`
3. Ensure webhook URL is HTTPS and publicly accessible

### "Cannot fetch product" error
- Verify the Amazon link is valid
- Try opening the link in a browser
- Some regions/products may not be scrapable

### No image in reply
- Some Amazon products don't have accessible images
- Bot will still send reply without image

### Import doesn't appear on site
- Check `/api/admin/telegram-import-bot` for import status
- Verify Firestore is accessible
- Check product was saved: Go to CMS products page

---

## Production Deployment

1. Set `TELEGRAM_BOT_TOKEN` in production environment variables
2. Configure webhook to point to `https://YOUR_DOMAIN.com/api/webhooks/telegram-import-bot`
3. Set bot commands in BotFather:
   ```
   /start - Get started with importing products
   /help - Show usage instructions
   /status - View your imports
   ```
4. Test with a real product link

---

## Security Notes

- Webhook is public but only processes valid Telegram requests
- Product data is saved to Firestore with `createdByUser` field
- Consider adding rate limiting for production
- All imports are logged in `telegram_imports` collection for audit

---

## Example Usage

1. User adds bot to their Telegram contacts
2. User sends: `https://amazon.in/dp/B0ABCDEF1234`
3. Bot replies:
   ```
   ✅ Product Added!
   
   Samsung 24-inch Full HD Monitor
   
   💰 Price: ₹14,999
   📌 Original: ₹19,999
   🏷️ Discount: 25%
   🔗 ASIN: B0ABCDEF1234
   
   📍 View on TEKPIK
   ```
4. Product is now available on TEKPIK with full description

---

## Support

- Check logs: `/api/admin/telegram-import-bot`
- Test webhook: **POST** `/api/admin/telegram-import-bot` with `action: "test-webhook"`
- View recent imports: **GET** `/api/admin/telegram-import-bot?limit=50`
