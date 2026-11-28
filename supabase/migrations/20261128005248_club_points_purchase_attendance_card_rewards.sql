create or replace function private.award_club_ticket_purchase_points()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare member_id uuid; award integer;
begin
  if coalesce(new.payment_status,'') <> 'completed' and new.paid_at is null then return new; end if;
  select u.id into member_id from auth.users u
  where u.id::text = coalesce(new.customer_id,'')
     or lower(u.email) = lower(coalesce(new.customer_email,''))
  limit 1;
  if member_id is null then return new; end if;
  award := (case when coalesce(new.category_name,'') ilike '%vip%' then 250 else 100 end) * greatest(coalesce(new.quantity,1),1);
  insert into public.club_point_transactions(user_id,points,reason,source,reference_id)
  values(member_id,award,'Points attribués après achat de billets','ticket_purchase',new.id::text)
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.award_club_ticket_purchase_points() from public,anon,authenticated;
drop trigger if exists club_award_ticket_purchase_points on public.orders;
create trigger club_award_ticket_purchase_points
after insert or update of payment_status, paid_at on public.orders
for each row execute function private.award_club_ticket_purchase_points();

create or replace function private.award_club_attendance_points()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare member_id uuid;
begin
  if coalesce(new.status,'') <> 'used' and new.checked_in_at is null then return new; end if;
  if tg_op = 'UPDATE' and coalesce(old.status,'') = 'used' and old.checked_in_at is not null then return new; end if;
  select u.id into member_id
  from auth.users u
  where lower(u.email) = lower(coalesce(new.holder_email,''))
     or exists (
       select 1 from public.orders o
       where o.id = new.order_id
         and (o.customer_id = u.id::text or lower(o.customer_email) = lower(u.email))
     )
  limit 1;
  if member_id is null then return new; end if;
  insert into public.club_point_transactions(user_id,points,reason,source,reference_id)
  values(member_id,150,'Présence au concert confirmée au contrôle','concert_attendance',new.id::text)
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.award_club_attendance_points() from public,anon,authenticated;
drop trigger if exists club_award_attendance_points on public.tickets;
create trigger club_award_attendance_points
after insert or update of status, checked_in_at on public.tickets
for each row execute function private.award_club_attendance_points();

create or replace function private.award_club_card_subscription_points()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.card_status <> 'active' then return new; end if;
  insert into public.club_point_transactions(user_id,points,reason,source,reference_id)
  values(new.user_id,300,'Adhésion LUMARÉEL Card activée','black_card_subscription',new.id::text)
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.award_club_card_subscription_points() from public,anon,authenticated;
drop trigger if exists club_award_card_subscription_points on public.membership_cards;
create trigger club_award_card_subscription_points
after insert or update of card_status on public.membership_cards
for each row execute function private.award_club_card_subscription_points();
