create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table if not exists public.club_member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  referral_code text not null unique default ('LMR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  created_at timestamptz not null default now()
);
create table if not exists public.club_point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  points integer not null check (points <> 0),
  reason text not null,
  source text not null,
  reference_id text,
  created_at timestamptz not null default now()
);
create unique index if not exists club_point_transactions_once_idx on public.club_point_transactions(user_id, source, reference_id) where reference_id is not null;
create index if not exists club_point_transactions_user_created_idx on public.club_point_transactions(user_id, created_at desc);

create table if not exists public.club_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  referral_code text not null,
  status text not null default 'pending' check (status in ('pending','validated','rejected')),
  reward_points integer not null default 500 check (reward_points = 500),
  qualifying_order_id text unique,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  constraint club_referrals_no_self check (referrer_user_id <> referred_user_id)
);
create index if not exists club_referrals_referrer_created_idx on public.club_referrals(referrer_user_id, created_at desc);

create table if not exists public.club_offers (
  id uuid primary key default gen_random_uuid(),
  offer_type text not null check (offer_type in ('flash','surprise')),
  title text not null,
  description text not null default '',
  cover_path text,
  benefit_label text,
  price_amount numeric(12,2),
  currency text not null default 'FCFA',
  conditions text,
  action_label text,
  action_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists club_offers_published_idx on public.club_offers(offer_type, status, ends_at);

create table if not exists public.club_backstage_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now()
);
create table if not exists public.club_backstage_media (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.club_backstage_collections(id) on delete set null,
  title text not null,
  description text not null default '',
  category text not null default 'backstage' check (category in ('ballon','session_studio','backstage','interviews','stories','originals','discover')),
  media_type text not null check (media_type in ('image','video')),
  storage_path text,
  thumbnail_path text,
  external_url text,
  duration text,
  artist_name text,
  event_id text references public.events(id) on delete set null,
  access_tier text not null default 'free' check (access_tier in ('free','club','card','tv_pass','vip')),
  access_note text,
  is_featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_backstage_media_source_check check (storage_path is not null or external_url is not null)
);
create index if not exists club_backstage_media_published_idx on public.club_backstage_media(status, category, published_at desc);

create table if not exists public.club_moment_albums (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  title text not null,
  description text not null default '',
  cover_path text,
  recap_url text,
  recap_duration text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id)
);
create table if not exists public.club_moment_media (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.club_moment_albums(id) on delete cascade,
  storage_path text not null,
  thumbnail_path text,
  caption text not null default '',
  media_type text not null default 'image' check (media_type in ('image','video')),
  downloadable boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists club_moment_media_album_idx on public.club_moment_media(album_id, sort_order, created_at);

create table if not exists public.club_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  suggestion_type text not null check (suggestion_type in ('artist','venue','event')),
  title text not null,
  description text not null default '',
  artist_type text,
  profile_url text,
  venue_type text,
  city text,
  reference_url text,
  concept text,
  suggested_venue text,
  suggested_artists text,
  status text not null default 'received' check (status in ('received','reviewing','selected','preparing','realized','declined')),
  admin_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists club_suggestions_user_created_idx on public.club_suggestions(user_id, created_at desc);
create index if not exists club_suggestions_admin_idx on public.club_suggestions(status, created_at desc);

create or replace function private.create_club_member_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.club_member_profiles(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.create_club_member_profile() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_club_profile on auth.users;
create trigger on_auth_user_created_club_profile after insert on auth.users for each row execute function private.create_club_member_profile();
insert into public.club_member_profiles(user_id) select id from auth.users on conflict (user_id) do nothing;

create or replace function private.user_has_event_access(p_event_id text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.tickets t join public.orders o on o.id = t.order_id
    where t.event_id = p_event_id and t.status in ('valid','used') and o.payment_status = 'completed'
      and (o.customer_id = auth.uid()::text or lower(coalesce(o.customer_email,'')) = lower(coalesce(auth.jwt() ->> 'email','')))
  );
$$;
revoke all on function private.user_has_event_access(text) from public;
grant execute on function private.user_has_event_access(text) to anon, authenticated;

create or replace function private.can_access_backstage_media(p_media_id uuid)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare media_row public.club_backstage_media%rowtype; has_card boolean := false; has_tv boolean := false;
begin
  select * into media_row from public.club_backstage_media where id = p_media_id and status = 'published';
  if not found then return false; end if;
  if media_row.access_tier = 'free' then return true; end if;
  if auth.uid() is null then return false; end if;
  if media_row.access_tier = 'club' then return true; end if;
  select exists(select 1 from public.membership_cards c where c.user_id = auth.uid() and c.card_status = 'active' and (c.expires_at is null or c.expires_at > now())) into has_card;
  select exists(select 1 from public.tv_subscriptions s where s.user_id = auth.uid() and s.status = 'active' and (s.expires_at is null or s.expires_at > now())) into has_tv;
  if media_row.access_tier = 'card' then return has_card; end if;
  if media_row.access_tier = 'tv_pass' then return has_card or has_tv; end if;
  if media_row.access_tier = 'vip' then return has_card or (media_row.event_id is not null and private.user_has_event_access(media_row.event_id)); end if;
  return false;
end;
$$;
revoke all on function private.can_access_backstage_media(uuid) from public;
grant execute on function private.can_access_backstage_media(uuid) to anon, authenticated;

create or replace function public.club_can_access_media(p_media_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.can_access_backstage_media(p_media_id); $$;
revoke all on function public.club_can_access_media(uuid) from public, anon;
grant execute on function public.club_can_access_media(uuid) to authenticated;

create or replace function private.apply_club_referral_code(p_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); referrer uuid; new_referral uuid;
begin
  if actor is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if p_code is null or length(trim(p_code)) < 5 then raise exception 'INVALID_REFERRAL_CODE' using errcode = '22023'; end if;
  select user_id into referrer from public.club_member_profiles where referral_code = upper(trim(p_code));
  if referrer is null then raise exception 'REFERRAL_CODE_NOT_FOUND' using errcode = 'P0002'; end if;
  if referrer = actor then raise exception 'SELF_REFERRAL_NOT_ALLOWED' using errcode = '22023'; end if;
  insert into public.club_referrals(referrer_user_id,referred_user_id,referral_code) values(referrer,actor,upper(trim(p_code))) returning id into new_referral;
  return new_referral;
exception when unique_violation then raise exception 'REFERRAL_ALREADY_APPLIED' using errcode = '23505';
end;
$$;
revoke all on function private.apply_club_referral_code(text) from public, anon;
grant execute on function private.apply_club_referral_code(text) to authenticated;
create or replace function public.club_apply_referral_code(p_code text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.apply_club_referral_code(p_code); $$;
revoke all on function public.club_apply_referral_code(text) from public, anon;
grant execute on function public.club_apply_referral_code(text) to authenticated;

create or replace function private.award_club_referral_on_paid_order()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare referral_row public.club_referrals%rowtype;
begin
  if coalesce(new.payment_status,'') <> 'completed' and new.paid_at is null then return new; end if;
  update public.club_referrals r set status='validated', qualifying_order_id=new.id::text, validated_at=now()
  where r.status='pending' and r.qualifying_order_id is null
    and (r.referred_user_id::text=coalesce(new.customer_id,'') or exists (
      select 1 from auth.users u where u.id=r.referred_user_id and lower(u.email)=lower(coalesce(new.customer_email,''))
    )) returning * into referral_row;
  if found then
    insert into public.club_point_transactions(user_id,points,reason,source,reference_id)
    values(referral_row.referrer_user_id,500,'Parrainage validé après achat qualifiant','referral',referral_row.id::text)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.award_club_referral_on_paid_order() from public, anon, authenticated;
drop trigger if exists club_award_referral_after_paid_order on public.orders;
create trigger club_award_referral_after_paid_order after insert or update of payment_status, paid_at on public.orders for each row execute function private.award_club_referral_on_paid_order();

alter table public.club_member_profiles enable row level security;
alter table public.club_point_transactions enable row level security;
alter table public.club_referrals enable row level security;
alter table public.club_offers enable row level security;
alter table public.club_backstage_collections enable row level security;
alter table public.club_backstage_media enable row level security;
alter table public.club_moment_albums enable row level security;
alter table public.club_moment_media enable row level security;
alter table public.club_suggestions enable row level security;

create policy club_member_profile_self_select on public.club_member_profiles for select to authenticated using (user_id=(select auth.uid()));
create policy club_member_profile_self_insert on public.club_member_profiles for insert to authenticated with check (user_id=(select auth.uid()));
create policy club_points_self_read on public.club_point_transactions for select to authenticated using (user_id=(select auth.uid()));
create policy club_points_admin_all on public.club_point_transactions for all to authenticated using ((select public.lumareel_current_admin_role())='super_admin') with check ((select public.lumareel_current_admin_role())='super_admin');
create policy club_referrals_own_read on public.club_referrals for select to authenticated using (referrer_user_id=(select auth.uid()) or referred_user_id=(select auth.uid()));
create policy club_referrals_admin_all on public.club_referrals for all to authenticated using ((select public.lumareel_current_admin_role())='super_admin') with check ((select public.lumareel_current_admin_role())='super_admin');
create policy club_offers_public_read on public.club_offers for select to anon,authenticated using (status='published');
create policy club_offers_admin_all on public.club_offers for all to authenticated using ((select public.lumareel_current_admin_role())='super_admin') with check ((select public.lumareel_current_admin_role())='super_admin');
create policy club_backstage_collections_public_read on public.club_backstage_collections for select to anon,authenticated using (status='published');
create policy club_backstage_collections_admin_all on public.club_backstage_collections for all to authenticated using ((select public.lumareel_current_admin_role())='super_admin') with check ((select public.lumareel_current_admin_role())='super_admin');
create policy club_backstage_media_public_catalog on public.club_backstage_media for select to anon,authenticated using (status='published');
create policy club_backstage_media_admin_all on public.club_backstage_media for all to authenticated using ((select public.lumareel_current_admin_role())='super_admin') with check ((select public.lumareel_current_admin_role())='super_admin');
create policy club_moment_albums_member_read on public.club_moment_albums for select to authenticated using (status='published' and private.user_has_event_access(event_id));
create policy club_moment_albums_admin_all on public.club_moment_albums for all to authenticated using ((select public.lumareel_current_admin_role())='super_admin') with check ((select public.lumareel_current_admin_role())='super_admin');
create policy club_moment_media_member_read on public.club_moment_media for select to authenticated using (
  exists(select 1 from public.club_moment_albums a where a.id=album_id and a.status='published' and private.user_has_event_access(a.event_id))
);
create policy club_moment_media_admin_all on public.club_moment_media for all to authenticated using ((select public.lumareel_current_admin_role())='super_admin') with check ((select public.lumareel_current_admin_role())='super_admin');
create policy club_suggestions_member_read on public.club_suggestions for select to authenticated using (user_id=(select auth.uid()));
create policy club_suggestions_member_insert on public.club_suggestions for insert to authenticated with check (user_id=(select auth.uid()));
create policy club_suggestions_admin_all on public.club_suggestions for all to authenticated using ((select public.lumareel_current_admin_role())='super_admin') with check ((select public.lumareel_current_admin_role())='super_admin');

grant select,insert on public.club_member_profiles to authenticated;
grant select,insert,update,delete on public.club_point_transactions,public.club_referrals,public.club_offers,public.club_backstage_collections,public.club_backstage_media,public.club_moment_albums,public.club_moment_media,public.club_suggestions to authenticated;
grant select on public.club_offers to anon;
grant select on public.club_backstage_collections,public.club_backstage_media to anon,authenticated;
grant select on public.club_moment_albums,public.club_moment_media to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('club-media','club-media',false,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy club_media_read_authorized on storage.objects for select to anon,authenticated using (
  bucket_id='club-media' and (
    exists(select 1 from public.club_backstage_media m where (m.storage_path=name or m.thumbnail_path=name) and m.status='published' and private.can_access_backstage_media(m.id))
    or exists(select 1 from public.club_moment_media mm join public.club_moment_albums a on a.id=mm.album_id where (mm.storage_path=name or mm.thumbnail_path=name) and a.status='published' and private.user_has_event_access(a.event_id))
    or exists(select 1 from public.club_moment_albums a where a.cover_path=name and a.status='published' and private.user_has_event_access(a.event_id))
    or exists(select 1 from public.club_offers o where o.cover_path=name and o.status='published')
  )
);
create policy club_media_admin_insert on storage.objects for insert to authenticated with check (bucket_id='club-media' and (select public.lumareel_current_admin_role())='super_admin');
create policy club_media_admin_update on storage.objects for update to authenticated using (bucket_id='club-media' and (select public.lumareel_current_admin_role())='super_admin') with check (bucket_id='club-media' and (select public.lumareel_current_admin_role())='super_admin');
create policy club_media_admin_delete on storage.objects for delete to authenticated using (bucket_id='club-media' and (select public.lumareel_current_admin_role())='super_admin');
