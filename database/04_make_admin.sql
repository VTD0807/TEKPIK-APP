-- ============================================================
-- TEKPIK — Promote a user to ADMIN
-- ============================================================

-- Step 1: Check if the user exists in auth.users
select id, email from auth.users where email = 'varshith.code@gmail.com';

-- Step 2: If they exist in auth.users but NOT in public.users,
-- manually insert them (the trigger may have missed them)
insert into public.users (id, name, email, image, role)
select
    id,
    coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    email,
    coalesce(raw_user_meta_data->>'avatar_url', ''),
    'ADMIN'
from auth.users
where email = 'varshith.code@gmail.com'
on conflict (id) do update set role = 'ADMIN';

-- Step 3: Verify
select id, email, role from public.users where email = 'varshith.code@gmail.com';
