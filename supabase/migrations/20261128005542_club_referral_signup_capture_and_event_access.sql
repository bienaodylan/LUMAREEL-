create or replace function private.create_club_member_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare referrer uuid; submitted_code text;
begin
  insert into public.club_member_profiles(user_id) values(new.id) on conflict(user_id) do nothing;
  submitted_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'referral_code','')));
  if submitted_code <> '' then
    select user_id into referrer from public.club_member_profiles where referral_code=submitted_code;
    if referrer is not null and referrer <> new.id then
      insert into public.club_referrals(referrer_user_id,referred_user_id,referral_code)
      values(referrer,new.id,submitted_code) on conflict(referred_user_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.user_has_event_access(p_event_id text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.tickets t join public.orders o on o.id=t.order_id
    where t.event_id=p_event_id and t.status in ('valid','used')
      and (o.payment_status='completed' or o.paid_at is not null)
      and (o.customer_id=auth.uid()::text or lower(coalesce(o.customer_email,''))=lower(coalesce(auth.jwt() ->> 'email','')))
  );
$$;
revoke all on function private.user_has_event_access(text) from public;
grant execute on function private.user_has_event_access(text) to anon,authenticated;