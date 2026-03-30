-- ============================================================
-- TEKPIK — Update users table for Firebase Auth UIDs
-- Firebase UIDs are strings (28 chars), not Supabase UUIDs
-- Run this if you're switching from Supabase Auth to Firebase Auth
-- ============================================================

-- Drop the foreign key constraint to auth.users (Supabase-specific)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Change id column type to text to support Firebase UIDs
ALTER TABLE public.users ALTER COLUMN id TYPE text;

-- Also update foreign keys in other tables
ALTER TABLE public.reviews ALTER COLUMN user_id TYPE text;
ALTER TABLE public.wishlists ALTER COLUMN user_id TYPE text;

-- Make admin users
INSERT INTO public.users (id, name, email, image, role)
VALUES
    ('firebase-uid-varshith-code', 'Varshith', 'varshith.code@gmail.com', '', 'ADMIN'),
    ('firebase-uid-varshithpaladugu', 'Varshith P', 'varshithpaladugu07@gmail.com', '', 'ADMIN')
ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

-- Note: Replace 'firebase-uid-varshith-code' with actual Firebase UID after first login
-- Get UIDs from Firebase Console → Authentication → Users
