# 💡 DealLens — Project Idea Document

> **Amazon Affiliate Product Discovery Platform**
> Built on GoCart (Next.js + Tailwind CSS) · Powered by AI via OpenRouter
> Version 1.0 · March 2026

---

## 📌 Table of Contents

1. [Project Overview](#1-project-overview)
2. [The Problem We Solve](#2-the-problem-we-solve)
3. [What DealLens Is — And What It Is Not](#3-what-deallens-is--and-what-it-is-not)
4. [Core Features](#4-core-features)
5. [AI Analyser — The Differentiator](#5-ai-analyser--the-differentiator)
6. [Community Review System](#6-community-review-system)
7. [Admin Dashboard — Adaptive & Data-Driven](#7-admin-dashboard--adaptive--data-driven)
8. [Tech Stack](#8-tech-stack)
9. [Architecture Overview](#9-architecture-overview)
10. [Database Schema Summary](#10-database-schema-summary)
11. [Page Map / Route Structure](#11-page-map--route-structure)
12. [API Surface](#12-api-surface)
13. [Monetisation Strategy](#13-monetisation-strategy)
14. [Amazon Associates Compliance](#14-amazon-associates-compliance)
15. [User Roles & Permissions](#15-user-roles--permissions)
16. [Environment & Configuration](#16-environment--configuration)
17. [Development Phases / Roadmap](#17-development-phases--roadmap)
18. [Future Ideas (v2+)](#18-future-ideas-v2)
19. [Folder Structure](#19-folder-structure)
20. [Key Design Decisions](#20-key-design-decisions)

---

## 1. Project Overview

**DealLens** is an Amazon Affiliate product discovery platform styled like a modern e-commerce storefront. Users can browse curated products, read AI-generated analysis, submit community reviews, and click through to Amazon via affiliate links.

The platform is **not** a store. No products are sold directly. No cart, no checkout, no payments. Every purchase happens on Amazon — and every qualifying purchase earns a commission via the Amazon Associates Program.

The base codebase is **GoCart** (`https://github.com/GreatStackDev/gocart`), an open-source multi-vendor e-commerce template built with Next.js and Tailwind CSS. We strip all transactional e-commerce features and rebuild it as a content + affiliate platform with AI and community layers on top.

---

## 2. The Problem We Solve

Shoppers face three core frustrations when buying on Amazon:

1. **Too many options** — Search results are flooded with look-alike products making it hard to find what's genuinely good.
2. **Untrustworthy reviews** — Amazon's own review system is polluted with fake reviews, incentivised reviews, and review manipulation.
3. **No plain-English explanation** — Product descriptions are written by sellers to sell, not to inform. There's no neutral voice saying "here's what's actually good and bad about this."

**DealLens solves all three:**

- We curate a focused catalogue of products worth attention
- Our AI analyses each product and generates an honest pros/cons breakdown
- Our community adds real, moderated reviews from actual users
- Every product links directly to Amazon so the user can buy with confidence

---

## 3. What DealLens Is — And What It Is Not

### ✅ What it IS:

- A product discovery and research platform
- An Amazon affiliate link aggregator with editorial value added
- An AI-powered product analyst
- A community review platform (moderated, honest)
- A curated catalogue — not every product on Amazon, just ones we believe in
- A content site that earns revenue through affiliate commissions

### ❌ What it is NOT:

- An e-commerce store (no cart, no checkout, no payment processing)
- A price comparison engine (no scraping, no price tracking)
- A multi-vendor marketplace (no seller accounts, no vendor dashboards)
- An Amazon product search (we curate manually via admin)
- A review site that competes with Amazon's own review section

---

## 4. Core Features

### 4.1 Public-Facing Features

| Feature | Description |
|---|---|
| Product Browse | Grid/list view of curated Amazon products with filters and search |
| Category Navigation | Browse by product category (Electronics, Kitchen, Fitness, etc.) |
| Product Detail Page | Full product page: images, description, AI analysis, community reviews |
| "View on Amazon" CTA | Every product has a prominent affiliate link button |
| AI Picks Page | Page showing products with the highest AI scores |
| Trending Deals | Products with highest discount percentages featured |
| Wishlist | Logged-in users can save products to a personal wishlist |
| Community Reviews | Users submit reviews (name, star rating, pros, cons, body text) |
| Search | Full-text search across product titles, brands, descriptions |
| Affiliate Disclosure | FTC-compliant disclosure on all relevant pages |

### 4.2 Admin Features

| Feature | Description |
|---|---|
| Adaptive Dashboard | Real-time metrics: product count, pending reviews, AI coverage, wishlist saves |
| Activity Feed | Live feed of last 10 platform events (reviews, new products, analyses) |
| Charts | Reviews over time (line chart) + AI score distribution (bar chart) |
| Product Management | Add, edit, delete products with all affiliate metadata |
| Review Moderation | Approve, reject, verify, or delete community reviews |
| AI Analysis Management | Trigger, view, and bulk-generate AI analyses |
| Wishlist Insights | See which products users save most — trending intelligence |
| Category Management | Add/edit/delete categories with product counts |
| User Management | View users, change roles (USER / ADMIN) |

---

## 5. AI Analyser — The Differentiator

This is the feature that separates DealLens from a basic affiliate link site.

### How it works

1. Admin adds a product with title, description, brand, price, and Amazon metadata
2. Admin triggers "Generate AI Analysis" from the product edit page or bulk analysis tool
3. The server sends a structured prompt to **OpenRouter** (using model `google/gemini-2.0-flash-exp:free` by default)
4. OpenRouter returns a structured JSON object
5. The JSON is parsed, validated, and stored in the `AiAnalysis` table
6. The analysis is immediately visible on the public product page

### What the AI generates

For every product, the AI produces:

| Field | Description | Example |
|---|---|---|
| `summary` | 2-3 sentence plain English overview | "This ergonomic desk chair offers solid lumbar support..." |
| `pros` | 4-6 genuine advantages | "Adjustable armrests", "Breathable mesh back" |
| `cons` | 3-4 honest disadvantages | "Assembly takes 45+ minutes", "Armrests feel plastic-y" |
| `whoIsItFor` | Target user description | "Best for remote workers who sit 6+ hours a day..." |
| `verdict` | One definitive sentence | "A reliable mid-range chair that punches above its price." |
| `score` | Integer score out of 10 | 7 |
| `scoreReason` | Why that score | "Great build for the price but lacks premium feel" |
| `valueForMoney` | Rating label | "Good" (Excellent / Good / Average / Poor) |

### OpenRouter Integration

- **Endpoint:** `https://openrouter.ai/api/v1/chat/completions`
- **Default model:** `google/gemini-2.0-flash-exp:free`
- **Model is configurable** via `OPENROUTER_MODEL` env variable — swap to any model on OpenRouter without code changes
- Required headers: `HTTP-Referer` (your site URL) + `X-Title` (your app name)
- Temperature: `0.3` (low — for consistent, factual output)
- Response format: raw JSON (prompt instructs model to return only JSON, no markdown fences)

### Bulk Analysis

Admins can trigger analysis for multiple or all unanalysed products at once:
- Rate limited to 1 product per 1.5 seconds to avoid hitting OpenRouter rate limits
- Live progress bar and running log shown in the admin UI
- Failed analyses are logged and retryable individually

### AI Score Display (public)

Every product card shows a small circular score badge (top-right corner) when an analysis exists:
- **8-10** → Green badge
- **6-7** → Amber badge
- **1-5** → Red badge

The full analysis is shown on the product detail page in a structured card layout.

---

## 6. Community Review System

Alongside AI analysis, real human reviews add trust and depth.

### Review Submission

- Any visitor can submit a review (name required if not logged in)
- Logged-in users auto-populate their name
- Fields: Star rating (1-5), Review title, Review body (50-2000 chars), Pros list, Cons list
- All new reviews default to **pending** (not visible until admin approves)
- Submission confirmation message shown: "Thanks! Your review is under review."

### Review Display

- Only **approved** reviews show on the public product page
- Sorted by: Most Recent (default), Most Helpful, Highest Rated, Lowest Rated
- Each review shows: stars, author name, date, "Verified" badge (if admin-verified), pros/cons chips, body text with expand/collapse, helpful vote count
- Rating breakdown bar chart shown (how many 5★, 4★, etc.)

### Review Moderation (Admin)

- Admin sees all reviews in a moderation table
- Tabs: All | Pending | Approved | Rejected
- Actions per review: Approve / Reject / Verify / Delete
- Bulk actions: Approve All Selected / Reject All Selected / Delete All Selected
- Filters: by product, by rating, by date range
- Expanded row view shows full review without leaving the page

### Anti-Spam Measures

- Reviews require admin approval before appearing publicly
- "Helpful" votes are cookie-rate-limited (one vote per session per review)
- Admin can mark reviews as "Verified" to indicate genuine buyers

---

## 7. Admin Dashboard — Adaptive & Data-Driven

The admin dashboard is the operational nerve centre of DealLens. It is designed to be **adaptive** — every number, chart, and badge reflects the real current state of the platform.

### Dashboard Home — Key Panels

#### Stat Cards (4 cards, real-time data)

| Card | Metric | Alert Behaviour |
|---|---|---|
| Total Products | Count of active products | "+n this week" trend |
| Pending Reviews | Reviews awaiting approval | Amber warning if > 0 |
| AI Coverage | Products with analysis / total | Progress bar |
| Wishlist Saves | Total wishlist entries | "+n this week" trend |

#### Activity Feed

Shows the last 10 platform events as a live feed:
- New review submitted
- Product added
- AI analysis generated
- Product wishlisted (aggregate: "n saves today")

Each entry shows a type icon, description, and relative timestamp ("2 hours ago").

#### Charts

- **Reviews Over Time** (line chart, last 30 days): Two lines — total submitted vs approved
- **AI Score Distribution** (bar chart): Products grouped by score range, coloured by quality

#### Quick Actions

- Add New Product
- Moderate Reviews (with pending count badge)
- Run Bulk AI Analysis (with unanalysed count badge)
- Manage Categories

### Admin Responsiveness

| Breakpoint | Layout |
|---|---|
| Mobile < 768px | Sidebar as drawer, 1-col stat cards, stacked charts, icon-only action buttons |
| Tablet 768-1024px | Sidebar collapsed to icons, 2x2 stat cards, stacked charts |
| Desktop > 1024px | Full sidebar, 1x4 stat cards, side-by-side charts |

### UX Patterns (applied to all admin pages)

- **Skeleton loaders** on all data-fetching sections (no spinners)
- **Empty states** with icon + message + CTA on every list/table
- **Confirmation modals** on all destructive actions
- **Toast notifications**: success (auto-dismiss 3s), error (manual dismiss)
- **Inline loading** on action buttons (e.g. "Analysing..." spinner on that row only)

---

## 8. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14+ (App Router) | SSR, routing, API routes, image optimisation |
| Styling | Tailwind CSS | Utility-first, fast, consistent with GoCart base |
| State Management | Redux Toolkit | Already in GoCart — keep productSlice, userSlice, uiSlice |
| Database | PostgreSQL (via Prisma ORM) | Relational, type-safe, migration support |
| Auth | NextAuth.js | Already in GoCart — sessions, role-based access |
| AI | OpenRouter API | Model-agnostic, free tier available, easy to swap models |
| Icons | Lucide React | Already in GoCart — consistent icon set |
| Charts | Recharts (or SVG) | Lightweight, composable, no external CSS conflicts |
| Hosting | Vercel (recommended) | Native Next.js support, edge functions, easy env vars |
| DB Hosting | Supabase / Railway / Neon | Managed PostgreSQL, free tiers available |

---

## 9. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEALLENS PLATFORM                        │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │    PUBLIC FRONTEND    │    │       ADMIN FRONTEND         │  │
│  │                      │    │                              │  │
│  │  Homepage            │    │  Dashboard (adaptive)        │  │
│  │  Product Detail      │    │  Product Management          │  │
│  │  Category Pages      │    │  Review Moderation           │  │
│  │  AI Picks            │    │  AI Analysis Management      │  │
│  │  Wishlist            │    │  Wishlist Insights           │  │
│  │  Search              │    │  User Management             │  │
│  │  Disclosure Page     │    │  Category Management         │  │
│  └──────────┬───────────┘    └──────────────┬───────────────┘  │
│             │                               │                  │
│             └──────────────┬────────────────┘                  │
│                            │                                   │
│                   ┌────────▼────────┐                          │
│                   │   NEXT.JS API   │                          │
│                   │    ROUTES       │                          │
│                   │                │                          │
│                   │ /api/products  │                          │
│                   │ /api/reviews   │                          │
│                   │ /api/ai/       │                          │
│                   │ /api/wishlist  │                          │
│                   │ /api/admin/*   │                          │
│                   └────────┬────────┘                          │
│                            │                                   │
│              ┌─────────────┼──────────────┐                    │
│              │             │              │                    │
│     ┌────────▼───┐  ┌──────▼─────┐  ┌───▼───────────┐        │
│     │ PostgreSQL  │  │  NextAuth  │  │  OpenRouter   │        │
│     │  (Prisma)  │  │ (Sessions) │  │  AI API       │        │
│     │            │  │            │  │               │        │
│     │ Products   │  │ Users      │  │ gemini-2.0    │        │
│     │ Reviews    │  │ Sessions   │  │ flash (free)  │        │
│     │ AiAnalysis │  │ Accounts   │  │               │        │
│     │ Wishlist   │  │            │  │ Configurable  │        │
│     └────────────┘  └────────────┘  └───────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow for AI Analysis:**
```
Admin clicks "Analyse"
  → POST /api/ai/analyse
  → Fetch product from DB
  → Build structured prompt
  → POST to OpenRouter API
  → Parse JSON response
  → Upsert AiAnalysis record in DB
  → Return analysis to admin UI
  → Public product page fetches and displays analysis
```

**Data flow for Review submission:**
```
User submits review
  → POST /api/reviews
  → Validate fields
  → Save to DB (isApproved = false)
  → Admin sees pending count increase in dashboard
  → Admin approves review in /admin/reviews
  → Review appears on public product page
```

---

## 10. Database Schema Summary

### Models

**Product**
- Core product info: title, slug, description, price, originalPrice, discount
- Affiliate data: affiliateUrl (required), asin
- Amazon metadata: rating, reviewCount
- Taxonomy: category, subCategory, brand, tags
- Display: imageUrls[], isFeatured, isActive
- Relations: reviews[], aiAnalysis, wishlists[]

**Review**
- Product relation (cascade delete)
- Optional user relation (for logged-in users)
- authorName (for guests)
- Content: rating (1-5), title, body, pros[], cons[]
- Moderation: isApproved (default false), isVerified (admin sets)
- Engagement: helpful (int, incremented by votes)

**AiAnalysis**
- One-to-one with Product (unique productId)
- Content: summary, pros[], cons[], whoIsItFor, verdict
- Score: score (1-10), scoreReason, valueForMoney
- Metadata: model (which OpenRouter model was used), generatedAt, updatedAt

**Wishlist**
- Junction table: userId + productId (unique pair)
- addedAt timestamp
- Cascade delete on user or product delete

**User** (from NextAuth, updated)
- Standard NextAuth fields
- role: USER | ADMIN (removed VENDOR/SELLER)
- Relations: reviews[], wishlists[]

**Category**
- name, slug, icon/emoji, description
- Used for dropdown filters and navigation

---

## 11. Page Map / Route Structure

### Public Routes (`app/(public)/`)

```
/                          → Homepage (hero, featured, AI picks, deals, categories)
/products/[id]             → Product detail (images, info, AI analysis, reviews)
/category/[slug]           → Category product grid
/search                    → Search results page
/ai-picks                  → All AI-analysed products sorted by score
/wishlist                  → User's saved products (auth required)
/disclosure                → Amazon affiliate disclosure (static, required)
/about                     → About DealLens (optional)
/contact                   → Contact page (optional)
```

### Auth Routes (`app/(auth)/`)

```
/login                     → Login page (NextAuth)
/register                  → Register page
```

### Admin Routes (`app/admin/`)

```
/admin                     → Dashboard home (adaptive metrics + charts)
/admin/products            → Product list table
/admin/products/new        → Add new product form
/admin/products/[id]/edit  → Edit product + AI analysis trigger
/admin/reviews             → Review moderation table
/admin/ai-analysis         → AI analysis coverage + bulk trigger
/admin/wishlist            → Wishlist insights analytics
/admin/categories          → Category management
/admin/users               → User management
```

---

## 12. API Surface

### Public Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/api/products` | List products (filters: category, featured, search, sort, page) |
| GET | `/api/products/[id]` | Single product with analysis + approved reviews |
| GET | `/api/categories` | All categories |
| GET | `/api/reviews` | Approved reviews for a product (`?productId=xxx`) |
| POST | `/api/reviews` | Submit a review (pending by default) |
| POST | `/api/reviews/[id]/helpful` | Increment helpful vote |
| GET | `/api/ai/analyse` | Get existing AI analysis (`?productId=xxx`) |
| GET | `/api/wishlist` | User's wishlist (auth required) |
| POST | `/api/wishlist` | Add to wishlist (auth required) |
| DELETE | `/api/wishlist/[productId]` | Remove from wishlist (auth required) |

### Admin-Only Endpoints (role: ADMIN required on all)

| Method | Route | Description |
|---|---|---|
| GET | `/api/admin/products` | All products with full metadata |
| POST | `/api/admin/products` | Create product |
| PUT | `/api/admin/products/[id]` | Update product |
| DELETE | `/api/admin/products/[id]` | Delete product |
| GET | `/api/admin/reviews` | All reviews with moderation controls |
| PATCH | `/api/admin/reviews/[id]` | Approve / reject / verify |
| DELETE | `/api/admin/reviews/[id]` | Delete review |
| POST | `/api/ai/analyse` | Generate AI analysis for one product |
| POST | `/api/ai/analyse/bulk` | Bulk generate AI analyses |
| GET | `/api/admin/activity` | Recent activity feed (last 10 events) |
| GET | `/api/admin/analytics` | Charts data (reviews over time, score distribution) |
| GET | `/api/admin/ai-analysis-status` | Coverage stats per product |
| GET | `/api/admin/wishlist-insights` | Most wishlisted products + activity chart |
| GET | `/api/admin/categories` | Categories with product counts |
| POST | `/api/admin/categories` | Create category |
| PUT | `/api/admin/categories/[id]` | Update category |
| DELETE | `/api/admin/categories/[id]` | Delete category |
| GET | `/api/admin/users` | All users |
| PATCH | `/api/admin/users/[id]` | Change user role |

---

## 13. Monetisation Strategy

### Primary Revenue: Amazon Associates

- Every product card and detail page has a "View on Amazon" button linking to the product via the affiliate link
- The affiliate tag is embedded in the `affiliateUrl` stored in the database (e.g. `?tag=deallens-20`)
- When a user clicks through and purchases anything on Amazon within 24 hours, DealLens earns a commission (typically 1-10% depending on category)
- No minimum traffic required to join — Amazon Associates is free to join

### Revenue Scaling Levers

| Lever | How it scales revenue |
|---|---|
| More products | More affiliate links = more entry points |
| Higher AI scores | Better products = more clicks = higher conversion |
| SEO-optimised pages | Organic traffic from product searches |
| Newsletter | Email subscribers can be re-engaged with new deals |
| AI Picks curation | High-score products = higher purchase intent clicks |
| Trending Deals section | Discount products drive urgency and clicks |

### Secondary Revenue (Future — v2)

- Sponsored product placements (brands pay for "Featured" status)
- Newsletter sponsorships
- Display advertising (non-Amazon affiliate networks)

### Important: No Direct Sales

DealLens does not process any payments. There are no Stripe keys, no payment webhooks, no order management. All revenue is earned passively through affiliate link clicks on Amazon.

---

## 14. Amazon Associates Compliance

Amazon has strict rules for Associates. DealLens is built to comply fully.

### Required Disclosures

- **Affiliate Disclosure banner** on every product page and category/AI picks page
- **Footer disclosure** on every page: "As an Amazon Associate we earn from qualifying purchases."
- **Dedicated /disclosure page** linked from the footer
- Disclosure text must be clear and conspicuous — not hidden

### Link Requirements

Every affiliate link in the codebase must have:
```html
target="_blank"
rel="noopener noreferrer sponsored"
```

The `sponsored` value in `rel` is required by Google and recommended by Amazon for transparency.

### Prohibited Practices

The platform must never:
- Display Amazon prices scraped from the page (prices change; use "Check price on Amazon" instead)
- Use Amazon product images downloaded and re-hosted (use hotlinked image URLs)
- Imply endorsement by Amazon
- Use "Amazon" in the brand name without permission

### Price Display Policy

Because Amazon prices change frequently:
- The `price` field in the database is a reference/guide only
- Product cards show the price with a note: "Price when last updated"
- Alternatively, replace with "Check current price →" as the CTA text

---

## 15. User Roles & Permissions

| Action | Guest | USER | ADMIN |
|---|---|---|---|
| Browse products | ✅ | ✅ | ✅ |
| View AI analysis | ✅ | ✅ | ✅ |
| View approved reviews | ✅ | ✅ | ✅ |
| Submit a review | ✅ (name required) | ✅ | ✅ |
| Vote "helpful" on review | ✅ (cookie-limited) | ✅ | ✅ |
| Save to wishlist | ❌ (redirect to login) | ✅ | ✅ |
| View wishlist | ❌ | ✅ | ✅ |
| Access /admin/* | ❌ | ❌ | ✅ |
| Add/edit/delete products | ❌ | ❌ | ✅ |
| Moderate reviews | ❌ | ❌ | ✅ |
| Trigger AI analysis | ❌ | ❌ | ✅ |
| Manage categories | ❌ | ❌ | ✅ |
| Change user roles | ❌ | ❌ | ✅ |

---

## 16. Environment & Configuration

### Required Environment Variables

```env
# ── Database ──────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/deallens

# ── Authentication ────────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# ── OpenRouter AI ─────────────────────────────────────────────
OPENROUTER_API_KEY=sk-or-your_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free

# ── Amazon ────────────────────────────────────────────────────
AMAZON_ASSOCIATE_TAG=yourtag-20

# ── App Config ────────────────────────────────────────────────
NEXT_PUBLIC_APP_NAME=DealLens
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### next.config.mjs — Image Domains

```js
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'm.media-amazon.com' },
    { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
    { protocol: 'https', hostname: 'images-eu.ssl-images-amazon.com' },
  ],
},
```

### OpenRouter Model Options

The `OPENROUTER_MODEL` env var can be any model on OpenRouter:

| Model | Cost | Speed | Quality |
|---|---|---|---|
| `google/gemini-2.0-flash-exp:free` | Free | Fast | Good (default) |
| `google/gemini-1.5-pro` | Paid | Medium | Excellent |
| `openai/gpt-4o-mini` | Low cost | Fast | Very Good |
| `anthropic/claude-3-haiku` | Low cost | Very Fast | Very Good |
| `meta-llama/llama-3-8b-instruct:free` | Free | Fast | Decent |

---

## 17. Development Phases / Roadmap

### Phase 1 — Strip & Clean (Week 1)
Remove all cart, checkout, order, payment, vendor features from GoCart. Delete unused Redux slices, Prisma models, API routes, and components. Confirm the build passes with zero errors before moving on.

### Phase 2 — Affiliate Foundation (Week 1-2)
Update Prisma schema for affiliate product model. Build updated ProductCard with "View on Amazon" CTA. Add affiliate disclosure components. Update Navbar and Footer.

### Phase 3 — Community Reviews (Week 2)
Build ReviewCard, ReviewForm, ReviewList components. Build review API routes (submit, fetch, helpful vote). Build admin review moderation page. Integrate reviews into product detail page.

### Phase 4 — AI Analyser (Week 2-3)
Build OpenRouter utility (`lib/openrouter.js`). Build AI analysis API routes (single + bulk). Build AiAnalysis UI component. Integrate into product detail page. Build AI Analysis admin management page.

### Phase 5 — Adaptive Admin Dashboard (Week 3)
Build admin layout (sidebar, topbar, mobile drawer). Build dashboard home (stat cards, activity feed, charts, quick actions). Build Wishlist Insights page. Update Products admin with new fields and bulk actions. Build admin analytics API routes.

### Phase 6 — Public Pages & Polish (Week 4)
Update Homepage (AI Picks section, Trending Deals). Build /ai-picks page, /wishlist page, /disclosure page. Add wishlist feature (toggle, API, heart button on cards).

### Phase 7 — QA & Launch (Week 4-5)
Full checklist verification. Cross-browser and mobile testing. Lighthouse performance audit. Amazon Associates application and compliance check. Deploy to Vercel with production DB.

---

## 18. Future Ideas (v2+)

### Content & Discovery
- **Product comparison tool** — compare 2-3 products side by side (specs, AI scores, prices)
- **"Similar products"** section on product detail page (same category, similar price)
- **Weekly AI Picks newsletter** — email digest of top-scored products added that week
- **Price history indicator** — "This is a low price" / "This is a high price" badge (manual input)

### SEO & Traffic
- **Programmatic SEO pages** — auto-generated pages like "Best {Category} Products" using product data
- **Sitemap generation** — `sitemap.xml` auto-generated from product slugs
- **OpenGraph images** — dynamic OG image per product with score badge (Next.js og:image)
- **Structured data (JSON-LD)** — Product schema, Review schema for Google rich results

### AI Enhancements
- **AI chat assistant** — "Ask our AI anything about this product" chat widget on product page
- **AI vs Community comparison** — side-by-side view of AI verdict vs community average rating
- **Auto re-analysis trigger** — re-analyse products when community sentiment shifts significantly
- **Multi-model comparison** — run analysis with two models and show both verdicts

### User Features
- **User profiles** — public profile showing reviews submitted, wishlist count
- **Review helpfulness leaderboard** — most helpful reviewers get a badge
- **Personalised recommendations** — "Because you saved X, you might like Y"
- **Browser extension** — "View DealLens analysis" overlay when browsing Amazon

### Admin & Operations
- **CSV product import** — bulk import products from a spreadsheet
- **Amazon PA API integration** — auto-fetch price, images, and metadata via Amazon's Product Advertising API
- **Webhook notifications** — Slack/email alert when a review is submitted or analysis fails
- **Click-through analytics** — track how many times "View on Amazon" is clicked per product

---

## 19. Folder Structure

```
deallens/
├── app/
│   ├── (public)/
│   │   ├── page.jsx                   ← Homepage
│   │   ├── products/[id]/page.jsx     ← Product detail
│   │   ├── category/[slug]/page.jsx   ← Category listing
│   │   ├── search/page.jsx            ← Search results
│   │   ├── ai-picks/page.jsx          ← AI curated picks
│   │   ├── wishlist/page.jsx          ← User wishlist (auth)
│   │   └── disclosure/page.jsx        ← Affiliate disclosure
│   ├── (auth)/
│   │   ├── login/page.jsx
│   │   └── register/page.jsx
│   ├── admin/
│   │   ├── layout.jsx                 ← Admin shell (sidebar + topbar)
│   │   ├── page.jsx                   ← Dashboard home
│   │   ├── products/
│   │   │   ├── page.jsx               ← Product table
│   │   │   ├── new/page.jsx           ← Add product form
│   │   │   └── [id]/edit/page.jsx     ← Edit product form
│   │   ├── reviews/page.jsx           ← Review moderation
│   │   ├── ai-analysis/page.jsx       ← AI analysis management
│   │   ├── wishlist/page.jsx          ← Wishlist insights
│   │   ├── categories/page.jsx        ← Category management
│   │   └── users/page.jsx             ← User management
│   └── api/
│       ├── products/
│       │   ├── route.js
│       │   └── [id]/route.js
│       ├── categories/route.js
│       ├── reviews/
│       │   ├── route.js
│       │   └── [id]/
│       │       ├── route.js
│       │       └── helpful/route.js
│       ├── ai/analyse/
│       │   ├── route.js
│       │   └── bulk/route.js
│       ├── wishlist/
│       │   ├── route.js
│       │   └── [productId]/route.js
│       ├── admin/
│       │   ├── products/route.js
│       │   ├── reviews/[id]/route.js
│       │   ├── activity/route.js
│       │   ├── analytics/route.js
│       │   ├── ai-analysis-status/route.js
│       │   ├── wishlist-insights/route.js
│       │   ├── categories/route.js
│       │   └── users/route.js
│       └── auth/[...nextauth]/route.js
│
├── components/
│   ├── ProductCard.jsx                ← Updated (affiliate CTA, AI badge, wishlist)
│   ├── Navbar.jsx                     ← Updated (no cart, AI Picks + wishlist icon)
│   ├── Footer.jsx                     ← Updated (disclosure link, affiliate text)
│   ├── AffiliateDisclosure.jsx        ← NEW (banner + inline variants)
│   ├── WishlistButton.jsx             ← NEW (heart toggle)
│   ├── ai/
│   │   └── AiAnalysis.jsx             ← NEW (full AI analysis card)
│   ├── reviews/
│   │   ├── ReviewCard.jsx             ← NEW
│   │   ├── ReviewForm.jsx             ← NEW
│   │   └── ReviewList.jsx             ← NEW
│   └── admin/
│       ├── StatCard.jsx               ← NEW (adaptive stat card)
│       ├── ActivityFeed.jsx           ← NEW
│       ├── ReviewsChart.jsx           ← NEW
│       └── ScoreDistributionChart.jsx ← NEW
│
├── lib/
│   ├── prisma.js                      ← Prisma client (existing)
│   ├── openrouter.js                  ← NEW (OpenRouter API utility)
│   ├── auth.js                        ← NextAuth config (updated)
│   └── toast.js                       ← NEW (simple toast utility)
│
├── prisma/
│   └── schema.prisma                  ← Updated schema
│
├── store/
│   ├── store.js                       ← Updated (no cart/order/vendor slices)
│   ├── productSlice.js                ← Keep
│   ├── userSlice.js                   ← Keep
│   └── uiSlice.js                     ← Keep
│
├── .env                               ← Local env (gitignored)
├── .env.example                       ← Template for all required vars
├── next.config.mjs                    ← Updated image domains
├── tailwind.config.js                 ← Updated colours
└── package.json
```

---

## 20. Key Design Decisions

### Why GoCart as the base?

GoCart is a production-quality Next.js + Tailwind template with a complete design system: responsive layouts, product grids, image galleries, admin panel structure, auth, Prisma, Redux — all pre-built. Building from scratch would take 3-4x longer. We strip what we don't need and add our unique value on top.

### Why OpenRouter instead of directly calling OpenAI or Google?

OpenRouter is a model-agnostic gateway. By using it:
- We can switch AI models with a single env variable change — no code changes required
- We can use free models (`gemini-2.0-flash-exp:free`) to keep operating costs at zero during early stages
- We get automatic fallbacks if one model is down
- We can A/B test different models for analysis quality without a redeploy

### Why manual product curation instead of Amazon API scraping?

Amazon's Product Advertising API is restrictive — it requires active sales before granting access. Manual curation via the admin panel means no API dependency, full control over which products are featured, better descriptions than Amazon's seller-supplied content, and genuine editorial quality.

### Why reviews require admin approval?

Spam, competitor sabotage, and low-quality reviews are real problems. A moderation layer ensures only genuine, readable reviews appear publicly, maintains brand safety, and creates a trust signal for users — moderated reviews feel more credible than unfiltered ones.

### Why not show live Amazon prices?

Amazon's Terms of Service prohibit displaying prices scraped from their pages without using the official PA API. Storing prices manually risks showing stale data. The safest approach is either showing "Check current price →" as the CTA, or showing the stored price with a "Price may vary" disclaimer. DealLens uses the latter by default.

### Why Tailwind over a component library like MUI or Chakra?

GoCart already uses Tailwind extensively. Introducing a second component system would create style conflicts and bundle bloat. Tailwind utility classes are sufficient for everything DealLens needs, and they keep the final bundle lean and fast.

### Why an adaptive admin dashboard?

Static mock data in admin panels is useless — admins need to see what's actually happening right now. The adaptive dashboard pulls real counts and events from the database on every load, so the admin always knows the true state of the platform: how many reviews need moderation, what AI coverage looks like, and which products users are saving most.

---

*Document version 1.0 — March 2026*

> **Before launch:** Replace `DealLens` with your actual brand name throughout the codebase.
> Replace `yourtag-20` in `AMAZON_ASSOCIATE_TAG` with your actual Amazon Associates tag.
> Apply for Amazon Associates at: https://affiliate-program.amazon.com