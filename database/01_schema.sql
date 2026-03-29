-- ============================================================
-- TEKPIK — Schema (run after 00_reset.sql)
-- All IDs use uuid. auth.users.id is uuid in Supabase.
-- ============================================================

-- ── ENUMS ────────────────────────────────────────────────────

create type public.user_role as enum ('USER', 'ADMIN');

-- ── USERS ────────────────────────────────────────────────────
-- Mirrors auth.users. Populated via trigger on signup.

create table public.users (
    id         uuid primary key references auth.users(id) on delete cascade,
    name       text not null default '',
    email      text not null default '',
    image      text not null default '',
    role       public.user_role not null default 'USER',
    created_at timestamptz not null default now()
);

-- ── CATEGORIES ───────────────────────────────────────────────

create table public.categories (
    id          uuid primary key default gen_random_uuid(),
    name        text not null unique,
    slug        text not null unique,
    icon        text not null default '🛍️',
    description text not null default '',
    created_at  timestamptz not null default now()
);

-- ── PRODUCTS ─────────────────────────────────────────────────

create table public.products (
    id             uuid primary key default gen_random_uuid(),
    title          text not null,
    slug           text not null unique,
    description    text not null default '',
    price          numeric(10,2) not null,
    original_price numeric(10,2),
    discount       int not null default 0,
    affiliate_url  text not null,
    asin           text,
    brand          text not null default '',
    image_urls     text[] not null default '{}',
    is_featured    boolean not null default false,
    is_active      boolean not null default true,
    category_id    uuid not null references public.categories(id) on delete restrict,
    tags           text[] not null default '{}',
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

-- ── REVIEWS ──────────────────────────────────────────────────

create table public.reviews (
    id          uuid primary key default gen_random_uuid(),
    product_id  uuid not null references public.products(id) on delete cascade,
    user_id     uuid references public.users(id) on delete set null,
    author_name text not null,
    rating      int not null check (rating between 1 and 5),
    title       text not null,
    body        text not null,
    pros        text[] not null default '{}',
    cons        text[] not null default '{}',
    is_approved boolean not null default false,
    is_verified boolean not null default false,
    helpful     int not null default 0,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- ── AI ANALYSIS ──────────────────────────────────────────────

create table public.ai_analysis (
    id              uuid primary key default gen_random_uuid(),
    product_id      uuid not null unique references public.products(id) on delete cascade,
    summary         text not null default '',
    pros            text[] not null default '{}',
    cons            text[] not null default '{}',
    who_is_it_for   text not null default '',
    verdict         text not null default '',
    score           int not null check (score between 1 and 10),
    score_reason    text not null default '',
    value_for_money text not null default 'Good',
    model           text not null default '',
    generated_at    timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- ── WISHLISTS ────────────────────────────────────────────────

create table public.wishlists (
    user_id    uuid not null references public.users(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    added_at   timestamptz not null default now(),
    primary key (user_id, product_id)
);

-- ── UPDATED_AT TRIGGER ───────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger products_updated_at
    before update on public.products
    for each row execute function public.set_updated_at();

create trigger reviews_updated_at
    before update on public.reviews
    for each row execute function public.set_updated_at();

create trigger ai_analysis_updated_at
    before update on public.ai_analysis
    for each row execute function public.set_updated_at();

-- ── AUTO-CREATE USER PROFILE ON SIGNUP ───────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    insert into public.users (id, name, email, image)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        coalesce(new.email, ''),
        coalesce(new.raw_user_meta_data->>'avatar_url', '')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
