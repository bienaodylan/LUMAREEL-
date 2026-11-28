-- ============================================================================
-- LUMARÉEL ECOSYSTEM — AUTONOMOUS LOYALTY, REFERRALS, SOUVENIRS COLLECTIONS,
-- CMS SETTINGS, CENTRALIZED MEDIA LIBRARY & AUDIT LOG (ADDITIVE MIGRATION)
-- ============================================================================

-- 1. CENTRALIZED MEDIA LIBRARY
create table if not exists public.cms_media (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  alt_text text not null default '',
  file_url text not null,
  storage_path text,
  mime_type text not null default 'image/jpeg',
  media_type text not null default 'image' check (media_type in ('image','video')),
  size_bytes bigint not null default 0,
  folder text not null default 'general',
  tags text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists cms_media_folder_created_idx on public.cms_media(folder, created_at desc);

-- 2. CMS SETTINGS (HOMEPAGE, BLACK CARD, ETC.)
create table if not exists public.cms_settings (
  key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- 3. SOUVENIRS EDITORIAL & PERSONAL COLLECTIONS
create table if not exists public.souvenir_collections (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  description text not null default '',
  cover_url text,
  is_editorial boolean not null default false,
  owner_user_id uuid references auth.users(id) on delete cascade,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint souvenir_collections_owner_check check (
    (is_editorial = true and owner_user_id is null) or
    (is_editorial = false and owner_user_id is not null)
  )
);
create index if not exists souvenir_collections_owner_idx on public.souvenir_collections(owner_user_id, created_at desc);
create index if not exists souvenir_collections_editorial_idx on public.souvenir_collections(is_editorial, is_published, sort_order);

create table if not exists public.souvenir_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.souvenir_collections(id) on delete cascade,
  photo_key text not null,
  photo_url text not null,
  title text not null default '',
  artist text not null default '',
  event_id text,
  event_title text not null default '',
  event_date text not null default '',
  event_venue text not null default '',
  album_id text,
  aspect_ratio numeric(5,3) not null default 0.8,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(collection_id, photo_key)
);
create index if not exists souvenir_collection_items_coll_idx on public.souvenir_collection_items(collection_id, sort_order, created_at desc);

-- 4. AUTONOMOUS GIFT POINTS ENGINE: RULES, CAMPAIGNS, REWARDS & REDEMPTIONS
alter table public.club_point_transactions
  add column if not exists transaction_type text not null default 'earn' check (transaction_type in ('earn','redeem','bonus','adjustment','reversal')),
  add column if not exists status text not null default 'confirmed' check (status in ('pending','confirmed','cancelled')),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.loyalty_rules (
  key text primary key,
  label text not null,
  description text not null default '',
  points integer not null check (points >= 0),
  validation_trigger text not null default 'completed_order',
  max_per_user integer,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.loyalty_rules(key, label, description, points, validation_trigger, max_per_user, is_active)
values
  ('referral_referrer', 'Parrainage validé (Parrain)', 'Crédit automatique au parrain dès le premier achat billet ou activation Black Card du filleul.', 500, 'first_paid_order_or_card', 50, true),
  ('referral_referee', 'Bienvenue parrainage (Filleul)', 'Bonus de bienvenue crédité au filleul lors de sa première commande validée.', 150, 'first_paid_order_or_card', 1, true),
  ('ticket_purchase_standard', 'Achat billet standard', 'Points attribués automatiquement par billet acheté.', 100, 'completed_order', null, true),
  ('ticket_purchase_vip', 'Achat billet VIP', 'Points attribués automatiquement par billet VIP acheté.', 250, 'completed_order', null, true),
  ('black_card_activation', 'Activation LUMARÉEL Black Card', 'Points attribués automatiquement lors de l’activation annuelle.', 500, 'black_card_active', 1, true),
  ('concert_attendance', 'Présence confirmée au concert', 'Points crédités automatiquement lors du scan billet à l’entrée.', 150, 'ticket_checkin', null, true)
on conflict (key) do nothing;

create table if not exists public.loyalty_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  rule_key text not null references public.loyalty_rules(key) on delete cascade,
  bonus_points integer not null default 0 check (bonus_points >= 0),
  multiplier numeric(4,2) not null default 1.00 check (multiplier >= 1.00),
  max_claims integer,
  claims_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  benefit_label text not null default '',
  points_cost integer not null check (points_cost > 0),
  stock_limit integer,
  redeemed_count integer not null default 0,
  cover_url text,
  conditions text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.loyalty_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references public.loyalty_rewards(id) on delete restrict,
  points_spent integer not null check (points_spent > 0),
  voucher_code text not null unique,
  status text not null default 'active' check (status in ('active','used','cancelled')),
  transaction_id uuid references public.club_point_transactions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists loyalty_redemptions_user_idx on public.loyalty_reward_redemptions(user_id, created_at desc);

-- 5. REAL MEMBER NOTIFICATIONS
create table if not exists public.member_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'system' check (type in ('points','referral','reward','order','card','souvenir','system')),
  title text not null,
  body text not null default '',
  link_page text,
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists member_notifications_user_idx on public.member_notifications(user_id, is_read, created_at desc);

-- 6. ADMIN AUDIT LOGS
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text not null default '',
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);

-- 7. ATOMIC REWARD REDEMPTION RPC (SERVER-SIDE BALANCE CHECK, NO NEGATIVE BALANCE)
create or replace function public.loyalty_redeem_reward(p_reward_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  r public.loyalty_rewards%rowtype;
  current_balance integer := 0;
  tx_id uuid;
  redemption_id uuid;
  v_code text;
begin
  if actor is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  -- Serialize per-user redemptions to prevent race-condition double spend
  perform pg_advisory_xact_lock(hashtext(actor::text));

  select * into r from public.loyalty_rewards where id = p_reward_id and is_active = true for update;
  if not found then
    raise exception 'REWARD_NOT_FOUND' using errcode = 'P0002';
  end if;

  if r.stock_limit is not null and r.redeemed_count >= r.stock_limit then
    raise exception 'REWARD_OUT_OF_STOCK' using errcode = '22023';
  end if;

  select coalesce(sum(points), 0) into current_balance
  from public.club_point_transactions
  where user_id = actor and status = 'confirmed';

  if current_balance < r.points_cost then
    raise exception 'INSUFFICIENT_POINTS' using errcode = '22023';
  end if;

  v_code := 'LMR-GIFT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.club_point_transactions(user_id, points, reason, source, reference_id, transaction_type, status, metadata)
  values (actor, -r.points_cost, 'Récompense débloquée : ' || r.title, 'reward_redemption', v_code, 'redeem', 'confirmed', jsonb_build_object('reward_id', r.id, 'voucher_code', v_code))
  returning id into tx_id;

  insert into public.loyalty_reward_redemptions(user_id, reward_id, points_spent, voucher_code, status, transaction_id)
  values (actor, r.id, r.points_cost, v_code, 'active', tx_id)
  returning id into redemption_id;

  update public.loyalty_rewards set redeemed_count = redeemed_count + 1 where id = r.id;

  insert into public.member_notifications(user_id, type, title, body, link_page, metadata)
  values (actor, 'reward', 'Récompense débloquée', r.title || ' — Code : ' || v_code, 'rewards', jsonb_build_object('voucher_code', v_code, 'points_spent', r.points_cost));

  return jsonb_build_object(
    'redemption_id', redemption_id,
    'voucher_code', v_code,
    'points_spent', r.points_cost,
    'new_balance', current_balance - r.points_cost
  );
end;
$$;
revoke all on function public.loyalty_redeem_reward(uuid) from public, anon;
grant execute on function public.loyalty_redeem_reward(uuid) to authenticated;

-- 8. UPGRADE REFERRAL VALIDATION TRIGGER WITH DYNAMIC RULES & NOTIFICATIONS
create or replace function private.award_club_referral_on_paid_order()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  referral_row public.club_referrals%rowtype;
  referrer_pts integer := 500;
  referee_pts integer := 0;
  max_refs integer := 50;
  validated_count integer := 0;
begin
  if coalesce(new.payment_status,'') <> 'completed' and new.paid_at is null then
    return new;
  end if;

  select points, coalesce(max_per_user, 50) into referrer_pts, max_refs
  from public.loyalty_rules where key = 'referral_referrer' and is_active = true;

  select points into referee_pts
  from public.loyalty_rules where key = 'referral_referee' and is_active = true;

  update public.club_referrals r
  set status = 'validated', qualifying_order_id = new.id::text, validated_at = now(), reward_points = coalesce(referrer_pts, 500)
  where r.status = 'pending'
    and r.qualifying_order_id is null
    and (r.referred_user_id::text = coalesce(new.customer_id,'')
      or exists (select 1 from auth.users u where u.id = r.referred_user_id and lower(u.email) = lower(coalesce(new.customer_email,''))))
  returning * into referral_row;

  if found then
    select count(*) into validated_count
    from public.club_referrals
    where referrer_user_id = referral_row.referrer_user_id and status = 'validated';

    if validated_count <= coalesce(max_refs, 50) and coalesce(referrer_pts, 500) > 0 then
      insert into public.club_point_transactions(user_id, points, reason, source, reference_id, transaction_type, status)
      values (referral_row.referrer_user_id, coalesce(referrer_pts, 500), 'Parrainage validé après achat qualifiant', 'referral', referral_row.id::text, 'earn', 'confirmed')
      on conflict do nothing;

      insert into public.member_notifications(user_id, type, title, body, link_page)
      values (referral_row.referrer_user_id, 'referral', 'Parrainage validé · +' || coalesce(referrer_pts, 500) || ' GP', 'Ton ami a validé son premier concert. Tes Gift Points ont été crédités automatiquement.', 'rewards');
    end if;

    if coalesce(referee_pts, 0) > 0 then
      insert into public.club_point_transactions(user_id, points, reason, source, reference_id, transaction_type, status)
      values (referral_row.referred_user_id, referee_pts, 'Bonus de bienvenue parrainage', 'referral_welcome', referral_row.id::text, 'bonus', 'confirmed')
      on conflict do nothing;

      insert into public.member_notifications(user_id, type, title, body, link_page)
      values (referral_row.referred_user_id, 'points', 'Bonus de bienvenue · +' || referee_pts || ' GP', 'Merci d’avoir rejoint LUMARÉEL via un parrainage.', 'rewards');
    end if;
  end if;

  return new;
end;
$$;

-- 9. RLS POLICIES (STRICT OWNERSHIP & ADMIN BOUNDARIES)
alter table public.cms_media enable row level security;
alter table public.cms_settings enable row level security;
alter table public.souvenir_collections enable row level security;
alter table public.souvenir_collection_items enable row level security;
alter table public.loyalty_rules enable row level security;
alter table public.loyalty_campaigns enable row level security;
alter table public.loyalty_rewards enable row level security;
alter table public.loyalty_reward_redemptions enable row level security;
alter table public.member_notifications enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy cms_media_public_read on public.cms_media for select to anon, authenticated using (true);
create policy cms_media_admin_all on public.cms_media for all to authenticated
  using ((select public.lumareel_current_admin_role()) = 'super_admin')
  with check ((select public.lumareel_current_admin_role()) = 'super_admin');

create policy cms_settings_public_read on public.cms_settings for select to anon, authenticated using (true);
create policy cms_settings_admin_all on public.cms_settings for all to authenticated
  using ((select public.lumareel_current_admin_role()) = 'super_admin')
  with check ((select public.lumareel_current_admin_role()) = 'super_admin');

create policy souvenir_collections_read on public.souvenir_collections for select to anon, authenticated
  using ((is_editorial = true and is_published = true) or owner_user_id = (select auth.uid()));
create policy souvenir_collections_member_write on public.souvenir_collections for all to authenticated
  using (is_editorial = false and owner_user_id = (select auth.uid()))
  with check (is_editorial = false and owner_user_id = (select auth.uid()));
create policy souvenir_collections_admin_all on public.souvenir_collections for all to authenticated
  using ((select public.lumareel_current_admin_role()) = 'super_admin')
  with check ((select public.lumareel_current_admin_role()) = 'super_admin');

create policy souvenir_items_read on public.souvenir_collection_items for select to anon, authenticated
  using (exists (
    select 1 from public.souvenir_collections c
    where c.id = collection_id
      and ((c.is_editorial = true and c.is_published = true) or c.owner_user_id = (select auth.uid()))
  ));
create policy souvenir_items_member_write on public.souvenir_collection_items for all to authenticated
  using (exists (
    select 1 from public.souvenir_collections c
    where c.id = collection_id and c.is_editorial = false and c.owner_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.souvenir_collections c
    where c.id = collection_id and c.is_editorial = false and c.owner_user_id = (select auth.uid())
  ));
create policy souvenir_items_admin_all on public.souvenir_collection_items for all to authenticated
  using ((select public.lumareel_current_admin_role()) = 'super_admin')
  with check ((select public.lumareel_current_admin_role()) = 'super_admin');

create policy loyalty_rules_public_read on public.loyalty_rules for select to anon, authenticated using (is_active = true);
create policy loyalty_rules_admin_all on public.loyalty_rules for all to authenticated
  using ((select public.lumareel_current_admin_role()) = 'super_admin')
  with check ((select public.lumareel_current_admin_role()) = 'super_admin');

create policy loyalty_campaigns_public_read on public.loyalty_campaigns for select to anon, authenticated using (is_active = true);
create policy loyalty_campaigns_admin_all on public.loyalty_campaigns for all to authenticated
  using ((select public.lumareel_current_admin_role()) = 'super_admin')
  with check ((select public.lumareel_current_admin_role()) = 'super_admin');

create policy loyalty_rewards_public_read on public.loyalty_rewards for select to anon, authenticated using (is_active = true);
create policy loyalty_rewards_admin_all on public.loyalty_rewards for all to authenticated
  using ((select public.lumareel_current_admin_role()) = 'super_admin')
  with check ((select public.lumareel_current_admin_role()) = 'super_admin');

create policy loyalty_redemptions_self_read on public.loyalty_reward_redemptions for select to authenticated using (user_id = (select auth.uid()));
create policy loyalty_redemptions_admin_all on public.loyalty_reward_redemptions for all to authenticated
  using ((select public.lumareel_current_admin_role()) = 'super_admin')
  with check ((select public.lumareel_current_admin_role()) = 'super_admin');

create policy notifications_self_read on public.member_notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_self_update on public.member_notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_admin_all on public.member_notifications for all to authenticated
  using ((select public.lumareel_current_admin_role()) = 'super_admin')
  with check ((select public.lumareel_current_admin_role()) = 'super_admin');

create policy admin_audit_logs_admin_only on public.admin_audit_logs for all to authenticated
  using ((select public.lumareel_current_admin_role()) = 'super_admin')
  with check ((select public.lumareel_current_admin_role()) = 'super_admin');
