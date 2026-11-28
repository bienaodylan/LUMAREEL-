create or replace function private.can_access_backstage_media(p_media_id uuid)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare media_row public.club_backstage_media%rowtype; has_card boolean := false; has_tv boolean := false;
begin
  select * into media_row from public.club_backstage_media where id=p_media_id and status='published';
  if not found then return false; end if;
  if media_row.access_tier='free' then return true; end if;
  if auth.uid() is null then return false; end if;
  if media_row.access_tier='club' then return true; end if;
  select exists(select 1 from public.membership_cards c where c.user_id=auth.uid() and c.card_status='active' and (c.expires_at is null or c.expires_at>now())) into has_card;
  select exists(select 1 from public.tv_subscriptions s where s.user_id=auth.uid() and s.status='active' and (s.expires_at is null or s.expires_at>now())) into has_tv;
  if media_row.access_tier='card' then return has_card; end if;
  if media_row.access_tier='tv_pass' then return has_tv; end if;
  if media_row.access_tier='vip' then return has_card or (media_row.event_id is not null and private.user_has_event_access(media_row.event_id)); end if;
  return false;
end;
$$;
revoke all on function private.can_access_backstage_media(uuid) from public;
grant execute on function private.can_access_backstage_media(uuid) to anon,authenticated;