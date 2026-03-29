# Supabase Dashboard Settings

## Authentication → Email

| Setting | Value |
|---|---|
| Confirm email | **OFF** (disable — we send our own welcome email) |
| Secure email change | ON |
| Minimum password length | 6 |

## Authentication → URL Configuration

| Setting | Value |
|---|---|
| Site URL | `http://localhost:3000` (change to prod URL on deploy) |
| Redirect URLs | `http://localhost:3000/auth/callback` |

## Authentication → Providers → Google (optional)

1. Create OAuth credentials at https://console.cloud.google.com
2. Add `https://<your-project>.supabase.co/auth/v1/callback` as authorized redirect URI
3. Paste Client ID and Secret into Supabase

## Making yourself Admin

Run `database/04_make_admin.sql` in SQL Editor after signing up.

## Production Email (Resend)

1. Sign up at https://resend.com — free tier: 3000 emails/month
2. Add `RESEND_API_KEY=re_xxx` to `.env.local`
3. Uncomment the Resend block in `app/api/auth/welcome/route.js`
4. Set `from` to a verified domain email
