-- ============================================================
-- TEKPIK — FULL RESET
-- Run this FIRST to wipe everything clean
-- Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Drop tables in reverse dependency order
drop table if exists public.wishlists      cascade;
drop table if exists public.ai_analysis    cascade;
drop table if exists public.reviews        cascade;
drop table if exists public.products       cascade;
drop table if exists public.categories     cascade;
drop table if exists public.users          cascade;

-- Drop custom types
drop type if exists public.user_role cascade;

-- Drop helper functions
drop function if exists public.is_admin()          cascade;
drop function if exists public.set_updated_at()    cascade;
drop function if exists public.handle_new_user()   cascade;

-- Drop triggers (cascade above handles most, but be explicit)
drop trigger if exists on_auth_user_created on auth.users;
