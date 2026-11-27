-- LUMARÉEL TV: monthly manual pass + archive preview records.
-- Additive only: existing ticketing, orders, Black Cards and archive records are preserved.

create table if not exists public.tv_pass_plans (
  id text primary key,
  name text not null,
  name_en text,
  description text not null default '',
  description_en text,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'FCFA',
  duration_days integer not null default 30 check (duration_days = 30),
  billing_cycle_label text not null default 'Par mois',
  billing_cycle_label_en text not null default 'Per month',
  auto_renew boolean not null default false check (auto_renew = false),
  renewal_policy text not null default 'Renouvellement manuel à chaque échéance.',
  conditions text not null default 'Accès personnel LUMARÉEL TV pendant 30 jours.',
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tv_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text not null,
  user_name text not null default '',
  plan_id text references public.tv_pass_plans(id) on delete restrict,
  plan_name text not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','active','expired','revoked','cancelled')),
  source text not null default 'paymetrust'
    check (source in ('paymetrust','admin_grant')),
  payment_reference text unique,
  provider_transaction_id text,
  amount_paid numeric(12,2) not null default 0,
  currency text not null default 'FCFA',
  auto_renew boolean not null default false check (auto_renew = false),
  starts_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tv_subscriptions_user_idx
  on public.tv_subscriptions (user_id, created_at desc);
create index if not exists tv_subscriptions_email_idx
  on public.tv_subscriptions (lower(user_email), created_at desc);
create index if not exists tv_subscriptions_status_expiry_idx
  on public.tv_subscriptions (status, expires_at);

create table if not exists public.tv_card_eligibility (
  id smallint primary key default 1 check (id = 1),
  enabled_plan_ids text[] not null default '{}'::text[],
  black_card_includes_vip_tier boolean not null default true,
  card_access_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.tv_pass_plans (
  id, name, name_en, description, description_en, price, currency,
  duration_days, billing_cycle_label, billing_cycle_label_en,
  auto_renew, renewal_policy, conditions, status
) values (
  'tv_pass_monthly',
  'LUMARÉEL TV Pass · Mensuel',
  'LUMARÉEL TV Pass · Monthly',
  'Accès aux concerts filmés, LUMARÉEL Originals, coulisses, interviews et rétrospectives pendant 30 jours.',
  'Access to filmed concerts, LUMARÉEL Originals, backstage, interviews and retrospectives for 30 days.',
  3500, 'FCFA', 30, 'Par mois', 'Per month', false,
  'Renouvellement manuel : aucun prélèvement automatique. Vous choisissez de payer chaque nouveau mois.',
  'Accès personnel sur vos appareils pendant 30 jours après confirmation du paiement.',
  'active'
) on conflict (id) do update set
  duration_days = 30,
  auto_renew = false,
  billing_cycle_label = 'Par mois',
  billing_cycle_label_en = 'Per month',
  renewal_policy = excluded.renewal_policy,
  conditions = excluded.conditions,
  updated_at = now();

insert into public.tv_card_eligibility (id, enabled_plan_ids, black_card_includes_vip_tier, card_access_enabled)
values (1, '{}'::text[], true, true)
on conflict (id) do nothing;

alter table public.tv_pass_plans enable row level security;
alter table public.tv_subscriptions enable row level security;
alter table public.tv_card_eligibility enable row level security;

revoke all on public.tv_pass_plans from anon, authenticated;
revoke all on public.tv_subscriptions from anon, authenticated;
revoke all on public.tv_card_eligibility from anon, authenticated;
grant select, insert, update, delete on public.tv_pass_plans to service_role;
grant select, insert, update, delete on public.tv_subscriptions to service_role;
grant select, insert, update, delete on public.tv_card_eligibility to service_role;

alter table public.archives add column if not exists is_demo boolean not null default false;

insert into public.archives (
  id, title, year, date, city, country, venue, artists, cover_image,
  description, youtube_url, youtube_embed_url, duration, photos,
  is_published, order_index, is_demo
) values
(
  'arch_jeune_lion_2026',
  'JEUNE LION — LA MESSE SCÉNIQUE',
  '2026', '19 Décembre 2026', 'Abidjan', 'Côte d’Ivoire',
  'Esplanade du Palais de la Culture',
  array['JEUNE LION','ORCHESTRE OBSIDIEN'],
  '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg',
  'Aperçu de démonstration : une scénographie d’ombres et de projecteurs pour illustrer la fiche archive LUMARÉEL.',
  'https://www.youtube.com/watch?v=ScMzIvxBSi4',
  'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
  '18:42',
  array['/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg','/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__3__e428cb5c.jpeg'],
  true, 1, true
),
(
  'arch_tiakola_2026',
  'TIAKOLA — M’POINT M LIVE EXPERIENCE',
  '2026', '20 Décembre 2026', 'Abidjan', 'Côte d’Ivoire',
  'Parc des Expositions d’Abidjan',
  array['TIAKOLA','INVITÉS EXCLUSIFS'],
  '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31_ef0db41e.jpeg',
  'Aperçu de démonstration : une fiche de concert avec galerie et récapitulatif vidéo.',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
  '24:10',
  array['/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31_ef0db41e.jpeg','/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__2__2459f9b9.jpeg'],
  true, 2, true
),
(
  'arch_wantche_2026',
  'WANTCHÉ — NOUVELLE VAGUE IVOIRE',
  '2026', '23 Décembre 2026', 'Abidjan', 'Côte d’Ivoire',
  'Esplanade du Palais de la Culture',
  array['WANTCHÉ','COLLECTIF BLOCKHAUSS'],
  '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.30_0f827a3a.jpeg',
  'Aperçu de démonstration : une rétrospective de concert avec visuel, artistes et médias.',
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
  'https://www.youtube-nocookie.com/embed/kJQP7kiw5Fk?rel=0',
  '15:35',
  array['/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.30_0f827a3a.jpeg','/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__1__5dc7b4f5.jpeg'],
  true, 3, true
),
(
  'arch_jamsco_2026',
  'JAMSCO — KINGDOM LIVE CONCERT',
  '2026', '30 Décembre 2026', 'Abidjan', 'Côte d’Ivoire',
  'Palais de la Culture Salle Lougah François',
  array['JAMSCO','ROYAL ORCHESTRA'],
  '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__1__b3fd3b01.jpeg',
  'Aperçu de démonstration : une page archive complète avec galerie photo et vidéo de récapitulatif.',
  'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
  'https://www.youtube-nocookie.com/embed/fJ9rUzIMcZQ?rel=0',
  '19:08',
  array['/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__1__b3fd3b01.jpeg','/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36_70028046.jpeg'],
  true, 4, true
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
