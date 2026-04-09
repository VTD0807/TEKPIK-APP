# OneSignal Setup Guide (TEKPIK)

## 1. Create OneSignal Web App
1. Go to OneSignal dashboard.
2. Create a new app.
3. Choose `Web Push`.
4. Configure site URL (production domain).

## 2. Add Required Env Variable
Set this in Vercel and local `.env.local`:

```bash
NEXT_PUBLIC_ONESIGNAL_APP_ID=your-onesignal-app-id
```

## 3. Service Worker Paths
This project already includes:
- `/public/OneSignalSDKWorker.js`
- `/public/OneSignalSDKUpdaterWorker.js`

Do not rename these unless you also update `components/OneSignalPushManager.jsx`.

## 4. Verify Prompt
1. Deploy to HTTPS domain.
2. Open site in a fresh browser profile (or clear site notification permission).
3. You should see browser prompt/slidedown prompt.

## 5. Identity Mapping
The app logs OneSignal user with Firebase UID:
- On login: `OneSignal.login(user.uid)`
- On logout: `OneSignal.logout()`

This allows targeted push to known users.

## 6. Common Reasons Prompt Doesn't Show
- Site is not HTTPS.
- Notification permission already denied.
- Missing `NEXT_PUBLIC_ONESIGNAL_APP_ID`.
- Service worker blocked by CSP or wrong path.

## 7. Re-test Steps
1. In browser site settings, reset notifications to `Ask`.
2. Hard refresh once.
3. Trigger app load; prompt should appear.

## 8. Optional Next Step (Server Push Send)
If you want admin-created notifications to also send browser push through OneSignal REST API, add:
- `ONESIGNAL_REST_API_KEY`
- API call from admin notification route to OneSignal `notifications` endpoint.
