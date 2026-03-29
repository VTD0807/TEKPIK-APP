-- ============================================================
-- TEKPIK — Utility Functions & Views (run after 02_rls.sql)
-- ============================================================

-- ── Product with stats view ───────────────────────────────────

create or replace view public.products_with_stats as
select
    p.*,
    c.name        as category_name,
    c.slug        as category_slug,
    c.icon        as category_icon,
    a.score       as ai_score,
    a.verdict     as ai_verdict,
    a.value_for_money,
    count(distinct r.id) filter (where r.is_approved)  as review_count,
    round(avg(r.rating) filter (where r.is_approved), 1) as avg_rating,
    count(distinct w.user_id)                           as wishlist_count
from public.products p
left join public.categories  c on c.id = p.category_id
left join public.ai_analysis a on a.product_id = p.id
left join public.reviews     r on r.product_id = p.id
left join public.wishlists   w on w.product_id = p.id
group by p.id, c.id, a.id;

-- ── Admin dashboard stats ─────────────────────────────────────

create or replace function public.get_admin_stats()
returns json language sql security definer as $$
    select json_build_object(
        'total_products',   (select count(*) from public.products where is_active),
        'pending_reviews',  (select count(*) from public.reviews  where not is_approved),
        'total_wishlists',  (select count(*) from public.wishlists),
        'ai_analysed',      (select count(*) from public.ai_analysis),
        'total_users',      (select count(*) from public.users)
    );
$$;

-- ── Increment helpful vote (rate-limited by cookie in app) ───

create or replace function public.increment_helpful(review_id uuid)
returns void language sql security definer as $$
    update public.reviews
    set helpful = helpful + 1
    where id = review_id;
$$;

-- ── Promote user to admin (call from Supabase dashboard) ─────

create or replace function public.make_admin(user_email text)
returns void language sql security definer as $$
    update public.users
    set role = 'ADMIN'
    where email = user_email;
$$;
