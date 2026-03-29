-- ============================================================
-- TEKPIK — Row Level Security (run after 01_schema.sql)
-- auth.uid() returns uuid, users.id is uuid — no casting needed
-- ============================================================

-- Enable RLS
alter table public.users       enable row level security;
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.reviews     enable row level security;
alter table public.ai_analysis enable row level security;
alter table public.wishlists   enable row level security;

-- ── HELPER: is current user an admin? ────────────────────────

create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
    select exists (
        select 1 from public.users
        where id = auth.uid()
        and role = 'ADMIN'
    );
$$;

-- ── USERS ────────────────────────────────────────────────────

create policy "users: public read"
    on public.users for select using (true);

create policy "users: own update"
    on public.users for update using (auth.uid() = id);

create policy "users: admin update"
    on public.users for update using (public.is_admin());

create policy "users: insert via trigger"
    on public.users for insert with check (true);

-- ── CATEGORIES ───────────────────────────────────────────────

create policy "categories: public read"
    on public.categories for select using (true);

create policy "categories: admin insert"
    on public.categories for insert with check (public.is_admin());

create policy "categories: admin update"
    on public.categories for update using (public.is_admin());

create policy "categories: admin delete"
    on public.categories for delete using (public.is_admin());

-- ── PRODUCTS ─────────────────────────────────────────────────

create policy "products: public read active"
    on public.products for select using (is_active = true);

create policy "products: admin read all"
    on public.products for select using (public.is_admin());

create policy "products: admin insert"
    on public.products for insert with check (public.is_admin());

create policy "products: admin update"
    on public.products for update using (public.is_admin());

create policy "products: admin delete"
    on public.products for delete using (public.is_admin());

-- ── REVIEWS ──────────────────────────────────────────────────

create policy "reviews: public read approved"
    on public.reviews for select using (is_approved = true);

create policy "reviews: admin read all"
    on public.reviews for select using (public.is_admin());

create policy "reviews: anyone can submit"
    on public.reviews for insert with check (true);

create policy "reviews: admin update"
    on public.reviews for update using (public.is_admin());

create policy "reviews: admin delete"
    on public.reviews for delete using (public.is_admin());

-- ── AI ANALYSIS ──────────────────────────────────────────────

create policy "ai_analysis: public read"
    on public.ai_analysis for select using (true);

create policy "ai_analysis: admin insert"
    on public.ai_analysis for insert with check (public.is_admin());

create policy "ai_analysis: admin update"
    on public.ai_analysis for update using (public.is_admin());

create policy "ai_analysis: admin delete"
    on public.ai_analysis for delete using (public.is_admin());

-- ── WISHLISTS ────────────────────────────────────────────────

create policy "wishlists: own read"
    on public.wishlists for select using (auth.uid() = user_id);

create policy "wishlists: own insert"
    on public.wishlists for insert with check (auth.uid() = user_id);

create policy "wishlists: own delete"
    on public.wishlists for delete using (auth.uid() = user_id);

create policy "wishlists: admin read all"
    on public.wishlists for select using (public.is_admin());
