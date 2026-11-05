-- LUMARÉEL CO. — authentification JWT pour les RPC de billetterie
-- Les API Vercel valident la session de l'utilisateur avec la clé publique.
-- Les RPC de création vérifient auth.uid() et public.users avant toute écriture.

create or replace function public.lumareel_current_admin_role()
returns text language plpgsql stable security definer set search_path=''
as $$
declare v_email text; v_role text; v_verified boolean;
begin
 select lower(email) into v_email from auth.users where id=(select auth.uid());
 if v_email is null then return null; end if;
 if v_email='bienaodylan428@gmail.com' then return 'super_admin'; end if;
 select role,coalesce(email_verified,false) into v_role,v_verified from public.users where lower(email)=v_email;
 if v_verified and v_role in ('super_admin','box_office') then return v_role; end if;
 return null;
end;
$$;

drop function if exists public.create_physical_ticket_batch(text,text,text,text,text,text,text,text,text,integer,text,text);
create or replace function public.create_physical_ticket_batch(
 p_request_id text,p_event_id text,p_event_title text,p_event_artist text,p_event_date text,
 p_event_time text,p_event_venue text,p_category_id text,p_category_name text,p_quantity integer,
 p_created_by text default 'LUMARÉEL CO.'
) returns jsonb language plpgsql security definer set search_path=public,extensions
as $$
declare v_ref text; v_year integer:=extract(year from now())::integer; v_start integer;
 v_artist_code text; v_i integer; v_serial text; v_token text; v_ticket_id uuid; v_tickets jsonb:='[]'::jsonb;
begin
 if public.lumareel_current_admin_role() not in ('super_admin','box_office') then raise exception 'Accès non autorisé.' using errcode='42501'; end if;
 if coalesce(length(trim(p_request_id)),0)<8 or length(p_request_id)>100 then raise exception 'Identifiant de demande invalide.'; end if;
 if p_quantity is null or p_quantity<1 or p_quantity>10000 then raise exception 'Quantité invalide.'; end if;
 if coalesce(trim(p_event_id),'')='' or coalesce(trim(p_event_title),'')='' or coalesce(trim(p_category_id),'')='' or coalesce(trim(p_category_name),'')='' then raise exception 'Informations de concert ou de catégorie manquantes.'; end if;
 select ref into v_ref from public.print_batches where request_id=p_request_id;
 if v_ref is not null then
  select coalesce(jsonb_agg(jsonb_build_object('id',id::text,'serialNumber',serial_number,'token',token) order by serial_number),'[]'::jsonb) into v_tickets from public.print_tickets where batch_ref=v_ref;
  return jsonb_build_object('success',true,'batchRef',v_ref,'tickets',v_tickets,'reused',true);
 end if;
 v_ref:='LMR-LOT-'||upper(encode(gen_random_bytes(6),'hex'));
 insert into public.print_batches(ref,request_id,event_id,event_title,event_artist,event_date,event_time,event_venue,category_id,category_name,quantity)
 values(v_ref,p_request_id,p_event_id,p_event_title,p_event_artist,p_event_date,p_event_time,p_event_venue,p_category_id,p_category_name,p_quantity)
 on conflict(request_id) do nothing;
 if not found then
  select ref into v_ref from public.print_batches where request_id=p_request_id;
  select coalesce(jsonb_agg(jsonb_build_object('id',id::text,'serialNumber',serial_number,'token',token) order by serial_number),'[]'::jsonb) into v_tickets from public.print_tickets where batch_ref=v_ref;
  return jsonb_build_object('success',true,'batchRef',v_ref,'tickets',v_tickets,'reused',true);
 end if;
 v_start:=public.reserve_print_serials(p_event_id,p_quantity);
 v_artist_code:=coalesce(nullif(left(regexp_replace(upper(coalesce(p_event_artist,'')),'[^A-Z]','','g'),3),''),'LMR');
 for v_i in 0..p_quantity-1 loop
  v_ticket_id:=gen_random_uuid();
  v_serial:=format('LMR-%s-%s-P%s',v_year,v_artist_code,lpad((v_start+v_i)::text,7,'0'));
  v_token:='TKT_SEC_'||upper(encode(gen_random_bytes(16),'hex'));
  insert into public.print_tickets(id,batch_ref,serial_number,token,status) values(v_ticket_id,v_ref,v_serial,v_token,'valid');
  v_tickets:=v_tickets||jsonb_build_array(jsonb_build_object('id',v_ticket_id::text,'serialNumber',v_serial,'token',v_token));
 end loop;
 return jsonb_build_object('success',true,'batchRef',v_ref,'tickets',v_tickets,'reused',false);
end;
$$;

drop function if exists public.create_lumareel_scanner_token(text,text,text,text,text,text,text,integer);
create or replace function public.create_lumareel_scanner_token(
 p_event_id text,p_event_title text,p_artist text,p_venue text,p_event_date text,p_event_time text,
 p_duration_hours integer default 24
) returns jsonb language plpgsql security definer set search_path=public,extensions
as $$
declare v_token text; v_exp timestamptz; v_email text;
begin
 if public.lumareel_current_admin_role() not in ('super_admin','box_office') then raise exception 'Accès non autorisé.' using errcode='42501'; end if;
 if coalesce(trim(p_event_id),'')='' or coalesce(trim(p_event_title),'')='' then raise exception 'Événement invalide.'; end if;
 select lower(email) into v_email from auth.users where id=(select auth.uid());
 v_exp:=now()+make_interval(hours=>least(72,greatest(1,coalesce(p_duration_hours,24))));
 v_token:='LMR_GATE_'||upper(encode(gen_random_bytes(32),'hex'));
 insert into public.scanner_tokens(token,event_id,event_title,artist,venue,event_date,event_time,created_by,expires_at)
 values(v_token,p_event_id,p_event_title,coalesce(p_artist,''),coalesce(p_venue,''),coalesce(p_event_date,''),coalesce(p_event_time,''),coalesce(v_email,'Direction LUMARÉEL'),v_exp);
 return jsonb_build_object('token',v_token,'eventId',p_event_id,'eventTitle',p_event_title,'artistName',coalesce(p_artist,''),'createdAt',now(),'expiresAt',v_exp,'revoked',false,'createdBy',coalesce(v_email,'Direction LUMARÉEL'));
end;
$$;

drop function if exists public.list_lumareel_scanner_tokens(text,text);
create or replace function public.list_lumareel_scanner_tokens(p_event_id text)
returns jsonb language plpgsql security definer set search_path=public
as $$
begin
 if public.lumareel_current_admin_role() not in ('super_admin','box_office') then raise exception 'Accès non autorisé.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',token,'token',token,'eventId',event_id,'createdBy',created_by,'createdAt',created_at,'expiresAt',expires_at,'revoked',is_revoked) order by created_at desc)
 from (select * from public.scanner_tokens where event_id=p_event_id order by created_at desc limit 50) t),'[]'::jsonb);
end;
$$;

revoke all on function public.lumareel_current_admin_role() from public,anon;
grant execute on function public.lumareel_current_admin_role() to authenticated;
revoke all on function public.create_physical_ticket_batch(text,text,text,text,text,text,text,text,text,integer,text) from public,anon,authenticated;
revoke all on function public.create_lumareel_scanner_token(text,text,text,text,text,text,integer) from public,anon,authenticated;
revoke all on function public.list_lumareel_scanner_tokens(text) from public,anon,authenticated;
revoke all on function public.reserve_print_serials(text,integer) from public,anon,authenticated;
grant execute on function public.create_physical_ticket_batch(text,text,text,text,text,text,text,text,text,integer,text) to authenticated;
grant execute on function public.create_lumareel_scanner_token(text,text,text,text,text,text,integer) to authenticated;
grant execute on function public.list_lumareel_scanner_tokens(text) to authenticated;
revoke all on function public.verify_lumareel_scanner_token(text,text) from public,anon,authenticated;
revoke all on function public.verify_and_check_in_physical_ticket(text,text,text,text) from public,anon,authenticated;
grant execute on function public.verify_lumareel_scanner_token(text,text) to anon,authenticated;
grant execute on function public.verify_and_check_in_physical_ticket(text,text,text,text) to anon,authenticated;
