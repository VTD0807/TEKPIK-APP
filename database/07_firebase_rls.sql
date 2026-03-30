-- ============================================================
-- TEKPIK — RLS for Firebase Auth (no auth.uid())
-- Since we use Firebase Auth, not Supabase Auth,
-- we disable RLS on tables that the app writes to directly
-- and rely on server-side validation instead.
-- Run after 06_firebase_users.sql
-- ============================================================

-- Disable RLS on all tables (Firebase handles auth, server validates)
ALTER TABLE public.users       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists   DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies (they reference auth.uid() which doesn't work with Firebase)
DROP POLICY IF EXISTS "users: public read"        ON public.users;
DROP POLICY IF EXISTS "users: own update"         ON public.users;
DROP POLICY IF EXISTS "users: admin update"       ON public.users;
DROP POLICY IF EXISTS "users: insert via trigger" ON public.users;

DROP POLICY IF EXISTS "categories: public read"   ON public.categories;
DROP POLICY IF EXISTS "categories: admin insert"  ON public.categories;
DROP POLICY IF EXISTS "categories: admin update"  ON public.categories;
DROP POLICY IF EXISTS "categories: admin delete"  ON public.categories;

DROP POLICY IF EXISTS "products: public read active" ON public.products;
DROP POLICY IF EXISTS "products: admin read all"     ON public.products;
DROP POLICY IF EXISTS "products: admin insert"       ON public.products;
DROP POLICY IF EXISTS "products: admin update"       ON public.products;
DROP POLICY IF EXISTS "products: admin delete"       ON public.products;

DROP POLICY IF EXISTS "reviews: public read approved" ON public.reviews;
DROP POLICY IF EXISTS "reviews: admin read all"       ON public.reviews;
DROP POLICY IF EXISTS "reviews: anyone can submit"    ON public.reviews;
DROP POLICY IF EXISTS "reviews: admin update"         ON public.reviews;
DROP POLICY IF EXISTS "reviews: admin delete"         ON public.reviews;

DROP POLICY IF EXISTS "ai_analysis: public read"   ON public.ai_analysis;
DROP POLICY IF EXISTS "ai_analysis: admin insert"  ON public.ai_analysis;
DROP POLICY IF EXISTS "ai_analysis: admin update"  ON public.ai_analysis;
DROP POLICY IF EXISTS "ai_analysis: admin delete"  ON public.ai_analysis;

DROP POLICY IF EXISTS "wishlists: own read"       ON public.wishlists;
DROP POLICY IF EXISTS "wishlists: own insert"     ON public.wishlists;
DROP POLICY IF EXISTS "wishlists: own delete"     ON public.wishlists;
DROP POLICY IF EXISTS "wishlists: admin read all" ON public.wishlists;

-- Verify
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
