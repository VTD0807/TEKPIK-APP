-- ============================================================
-- TEKPIK — Promote users to ADMIN
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Upsert both admin accounts from auth.users into public.users with ADMIN role
INSERT INTO public.users (id, name, email, image, role)
SELECT
    id,
    coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
    email,
    coalesce(raw_user_meta_data->>'avatar_url', ''),
    'ADMIN'
FROM auth.users
WHERE email IN ('varshith.code@gmail.com', 'varshithpaladugu07@gmail.com')
ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

-- Verify
SELECT id, email, role FROM public.users
WHERE email IN ('varshith.code@gmail.com', 'varshithpaladugu07@gmail.com');
