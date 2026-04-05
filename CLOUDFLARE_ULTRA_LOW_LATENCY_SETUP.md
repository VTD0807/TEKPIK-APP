# Cloudflare Ultra Low Latency Setup (TEKPIK)

This is a beginner-friendly, click-by-click setup for Cloudflare.
It is written for your current status: nameservers already changed and DNS records visible in Cloudflare.

## A) Current Status Check (based on your screenshot)

Your DNS page looks mostly correct:

- `A` record for root domain is proxied (orange cloud) - good.
- `CNAME` for `www` is proxied - good.
- TXT records are DNS only - correct.

Before continuing, confirm the zone is **Active**:

1. Open Cloudflare dashboard for your domain.
2. Go to `Overview`.
3. Ensure status says `Active`.

If status is `Pending`, wait for nameserver propagation first.

## B) DNS Finalization (important)

Go to `DNS` -> `Records`.

1. Keep web traffic records proxied (orange cloud):
   - root record (`@` / `tekpik.in`)
   - `www`
   - `app` (if actively used)
2. Keep TXT/MX/email verification records as DNS only (gray cloud).

### Hosting consistency check

Make sure root and `www` point to the same hosting platform.

- If your app is on Vercel, recommended setup is usually:
  - `A @` -> `76.76.21.21`
  - `CNAME www` -> `cname.vercel-dns.com`
- If you use a different host for root, keep it consistent and intentional.

Do not change this blindly. Verify with your deployment provider first.

## C) SSL and Security Settings

Go to `SSL/TLS`.

1. `Overview`:
   - Set mode to `Full (strict)`.
2. `Edge Certificates`:
   - `Always Use HTTPS` -> ON
   - `Automatic HTTPS Rewrites` -> ON
   - `TLS 1.3` -> ON
3. `Settings`:
   - `Minimum TLS Version` -> `TLS 1.2`

## D) Network and Speed Settings

1. Go to `Network`:
   - `HTTP/3 (with QUIC)` -> ON
   - `0-RTT Connection Resumption` -> ON
2. Go to `Speed` -> `Optimization`:
   - `Brotli` -> ON
   - `Early Hints` -> ON

Optional paid features:

- Argo Smart Routing -> ON
- APO -> ON (only if most pages are anonymous/public)

## E) Caching Baseline Settings

Go to `Caching`.

1. `Configuration`:
   - `Tiered Cache` -> ON
   - `Smart Tiered Cache` -> ON
   - `Origin Cache Control` -> ON

## F) Create Cache Rules (exact order)

Go to `Rules` -> `Cache Rules` -> `Create rule`.

Order matters. Place Rule 1 at top, Rule 4 at bottom.

### Rule 1 - Bypass private/admin traffic

Name: `Bypass Private And Admin`

If incoming requests match:

- URI Path contains `/admin`
- OR URI Path contains `/cms`
- OR URI Path contains `/store`
- OR URI Path contains `/e`
- OR Cookie contains `fb-token=`

Then:

- Cache eligibility: `Bypass cache`

### Rule 2 - Cache static assets for long time

Name: `Cache Static Assets`

If incoming requests match:

- URI Path starts with `/_next/static/`
- OR URI Path starts with `/assets/`

Then:

- Cache eligibility: `Eligible for cache`
- Edge TTL: `1 year`
- Browser TTL: `1 year`

### Rule 3 - Cache public pages briefly

Name: `Cache Public Pages`

If incoming requests match:

- URI Path does not start with `/api/`

Then:

- Cache eligibility: `Eligible for cache`
- Edge TTL: `3 minutes`
- Browser TTL: `2 minutes`
- Respect origin cache-control: `ON`

### Rule 4 - Cache safe public APIs

Name: `Cache Public APIs`

If incoming requests match:

- URI Path starts with `/api/products`
- OR URI Path starts with `/api/recommendations/feed`

Then:

- Cache eligibility: `Eligible for cache`
- Edge TTL: `2 minutes`
- Browser TTL: `30 seconds`

## G) Deploy Worker (recommended)

Worker files in this repo:

- `cloudflare/edge-cache-worker.js`
- `cloudflare/wrangler.toml`

Deploy steps:

1. Open terminal in project root.
2. Run: `npx wrangler login`
3. Run: `npx wrangler deploy --config cloudflare/wrangler.toml`
4. Edit `cloudflare/wrangler.toml` and add route:

```toml
routes = [
  { pattern = "tekpik.in/*", zone_name = "tekpik.in" }
]
```

5. Deploy again:
   - `npx wrangler deploy --config cloudflare/wrangler.toml`

## H) Purge Strategy (when content changes)

Use `Caching` -> `Configuration` -> `Purge Cache` -> `Custom Purge`.

Purge only changed URLs, not full cache.

Common purge list after product updates:

- `/`
- `/shop`
- `/api/products`
- `/products/{id}`

## I) Validation (must do)

Use browser devtools `Network` tab and inspect response headers.

1. For public pages/assets, second reload should show `cf-cache-status: HIT`.
2. For admin/cms/store routes, should show `BYPASS` or `DYNAMIC`.
3. Logged-in/private content must never be served from shared cache.
4. Re-test from mobile network and desktop.

## J) Troubleshooting Quick Fixes

If page not loading after enabling proxy:

1. Temporarily set affected DNS record to DNS only (gray cloud).
2. Confirm origin server is reachable directly.
3. Re-enable proxy once origin is fixed.

If SSL errors appear:

1. Keep mode on `Full` temporarily.
2. Fix origin certificate.
3. Switch back to `Full (strict)`.

If cache is not hitting:

1. Confirm cache rules order.
2. Confirm request is not matching bypass rule.
3. Confirm response is 200 and cacheable.

## K) Latency Targets

- Static assets: < 50ms edge TTFB in-region
- Cached public HTML/API: < 120ms edge TTFB in-region
- Uncached dynamic requests: < 400ms origin response target
