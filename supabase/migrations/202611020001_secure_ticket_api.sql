-- LUMARÉEL CO. — alignement sécurisé des API de billetterie physique
-- Projet Supabase : jwimueyxtbkiwwpidabj
-- Tables print_batches, print_tickets et print_counters préexistantes conservées.
-- Les appels de création passent par les API Vercel avec service_role après validation JWT.

create table if not exists public.scanner_tokens (
  token text primary key, event_id text not null, event_title text not null,
  artist text not null default '', venue text not null default '',
  event_date text not null default '', event_time text not null default '',
  created_by text not null, created_at timestamptz not null default now(),
  expires_at timestamptz not null, is_revoked boolean not null default false
);
create index if not exists idx_scanner_tokens_event_created on public.scanner_tokens(event_id,created_at desc);
alter table public.scanner_tokens enable row level security;

create table if not exists public.physical_ticket_scan_logs (
  id bigint generated always as identity primary key, ticket_id uuid,
  token_or_serial text not null, event_id text, agent_name text not null,
  result text not null check(result in ('SUCCESS','ALREADY_USED','INVALID','CANCELLED','WRONG_EVENT')),
  message text not null, scanned_at timestamptz not null default now(), ticket_serial text
);
create index if not exists idx_print_scan_event_time on public.physical_ticket_scan_logs(event_id,scanned_at desc);
create index if not exists idx_print_scan_ticket_time on public.physical_ticket_scan_logs(ticket_id,scanned_at desc);
alter table public.physical_ticket_scan_logs enable row level security;

create or replace function public.lumareel_is_box_office(p_actor_email text)
returns boolean language sql stable security definer set search_path=''
as $$
 select lower(coalesce(p_actor_email,''))='bienaodylan428@gmail.com'
 or exists(select 1 from public.users pu where lower(pu.email)=lower(coalesce(p_actor_email,'')) and pu.role in ('super_admin','box_office') and coalesce(pu.email_verified,false)=true);
$$;

create or replace function public.create_physical_ticket_batch(
 p_request_id text,p_event_id text,p_event_title text,p_event_artist text,p_event_date text,
 p_event_time text,p_event_venue text,p_category_id text,p_category_name text,p_quantity integer,
 p_actor_email text,p_created_by text default 'LUMARÉEL CO.'
) returns jsonb language plpgsql security definer set search_path=public,extensions
as $$
declare v_ref text; v_year integer:=extract(year from now())::integer; v_start integer;
 v_artist_code text; v_i integer; v_serial text; v_token text; v_ticket_id uuid; v_tickets jsonb:='[]'::jsonb;
begin
 if not public.lumareel_is_box_office(p_actor_email) then raise exception 'Accès non autorisé.' using errcode='42501'; end if;
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

create or replace function public.create_lumareel_scanner_token(
 p_event_id text,p_event_title text,p_artist text,p_venue text,p_event_date text,p_event_time text,
 p_actor_email text,p_duration_hours integer default 24
) returns jsonb language plpgsql security definer set search_path=public,extensions
as $$
declare v_token text; v_exp timestamptz;
begin
 if not public.lumareel_is_box_office(p_actor_email) then raise exception 'Accès non autorisé.' using errcode='42501'; end if;
 if coalesce(trim(p_event_id),'')='' or coalesce(trim(p_event_title),'')='' then raise exception 'Événement invalide.'; end if;
 v_exp:=now()+make_interval(hours=>least(72,greatest(1,coalesce(p_duration_hours,24))));
 v_token:='LMR_GATE_'||upper(encode(gen_random_bytes(32),'hex'));
 insert into public.scanner_tokens(token,event_id,event_title,artist,venue,event_date,event_time,created_by,expires_at)
 values(v_token,p_event_id,p_event_title,coalesce(p_artist,''),coalesce(p_venue,''),coalesce(p_event_date,''),coalesce(p_event_time,''),coalesce(p_actor_email,'LUMARÉEL CO.'),v_exp);
 return jsonb_build_object('token',v_token,'eventId',p_event_id,'eventTitle',p_event_title,'artistName',coalesce(p_artist,''),'createdAt',now(),'expiresAt',v_exp,'revoked',false,'createdBy',coalesce(p_actor_email,'LUMARÉEL CO.'));
end;
$$;

create or replace function public.list_lumareel_scanner_tokens(p_event_id text,p_actor_email text)
returns jsonb language plpgsql security definer set search_path=public
as $$
begin
 if not public.lumareel_is_box_office(p_actor_email) then raise exception 'Accès non autorisé.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',token,'token',token,'eventId',event_id,'createdBy',created_by,'createdAt',created_at,'expiresAt',expires_at,'revoked',is_revoked) order by created_at desc)
 from (select * from public.scanner_tokens where event_id=p_event_id order by created_at desc limit 50) t),'[]'::jsonb);
end;
$$;

create or replace function public.verify_lumareel_scanner_token(p_token text,p_event_id text default null)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_gate public.scanner_tokens%rowtype;
begin
 select * into v_gate from public.scanner_tokens where token=p_token and is_revoked=false and expires_at>now();
 if not found then return jsonb_build_object('valid',false,'error','Jeton invalide, révoqué ou expiré.'); end if;
 if p_event_id is not null and p_event_id<>v_gate.event_id then return jsonb_build_object('valid',false,'error','Jeton non autorisé pour cet événement.'); end if;
 return jsonb_build_object('valid',true,'token',jsonb_build_object('token',v_gate.token,'event_id',v_gate.event_id,'created_by',v_gate.created_by,'expires_at',v_gate.expires_at,'is_revoked',v_gate.is_revoked),
 'event',jsonb_build_object('id',v_gate.event_id,'title',v_gate.event_title,'artist',v_gate.artist,'venue',v_gate.venue,'date',v_gate.event_date,'time',v_gate.event_time),'expiresAt',v_gate.expires_at);
end;
$$;

create or replace function public.verify_and_check_in_physical_ticket(p_token text,p_event_id text,p_agent_name text,p_scanner_token text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_gate public.scanner_tokens%rowtype; v_ticket public.print_tickets%rowtype;
 v_result text; v_message text; v_now timestamptz:=now();
begin
 select * into v_gate from public.scanner_tokens where token=p_scanner_token and is_revoked=false and expires_at>v_now;
 if not found or (p_event_id is not null and v_gate.event_id<>p_event_id) then return jsonb_build_object('valid',false,'status','INVALID','error','Lien vigile invalide ou expiré.'); end if;
 select * into v_ticket from public.print_tickets where token=upper(p_token) or serial_number=upper(p_token) for update;
 if not found then v_result:='INVALID'; v_message:='Billet introuvable ou faux code QR.';
 elsif not exists(select 1 from public.print_batches b where b.ref=v_ticket.batch_ref and b.event_id=v_gate.event_id) then v_result:='WRONG_EVENT'; v_message:='Ce billet est pour un autre concert.';
 elsif v_ticket.status='used' then v_result:='ALREADY_USED'; v_message:='BILLET DÉJÀ UTILISÉ. REFUS D’ACCÈS.';
 elsif v_ticket.status='cancelled' then v_result:='CANCELLED'; v_message:='Ce billet a été annulé.';
 else update public.print_tickets set status='used',checked_in_at=v_now,checked_in_by=left(coalesce(nullif(p_agent_name,''),'Agent de contrôle'),100) where id=v_ticket.id;
  v_result:='SUCCESS'; v_message:='ACCÈS AUTORISÉ';
 end if;
 insert into public.physical_ticket_scan_logs(ticket_id,token_or_serial,event_id,agent_name,result,message,scanned_at,ticket_serial)
 values(v_ticket.id,left(coalesce(p_token,''),160),v_gate.event_id,left(coalesce(nullif(p_agent_name,''),'Agent de contrôle'),100),v_result,v_message,v_now,v_ticket.serial_number);
 return jsonb_build_object('valid',v_result='SUCCESS','status',v_result,'message',v_message,'error',case when v_result='INVALID' then v_message else null end,
 'holderName','Billet physique','categoryName',coalesce((select category_name from public.print_batches where ref=v_ticket.batch_ref),''),
 'eventTitle',v_gate.event_title,'serialNumber',v_ticket.serial_number,'scannedAt',case when v_result in ('SUCCESS','ALREADY_USED') then coalesce(v_ticket.checked_in_at,v_now) else null end,
 'ticket',jsonb_build_object('id',v_ticket.id,'holderName','Billet physique','categoryName',coalesce((select category_name from public.print_batches where ref=v_ticket.batch_ref),''),'eventTitle',v_gate.event_title,'eventVenue',v_gate.venue,'eventDate',v_gate.event_date,'eventTime',v_gate.event_time,'serialNumber',v_ticket.serial_number,'status',v_ticket.status));
end;
$$;

create or replace function public.reserve_print_serials(p_event text,p_qty integer)
returns integer language plpgsql set search_path=public
as $$
declare v_start integer;
begin
 insert into public.print_counters(event_id,last_seq) values(p_event,p_qty)
 on conflict(event_id) do update set last_seq=public.print_counters.last_seq+p_qty
 returning last_seq-p_qty+1 into v_start;
 return v_start;
end;
$$;

drop function if exists public.create_physical_ticket_batch(text,text,text,text,text,text,text,text,text,integer,text);
drop function if exists public.create_lumareel_scanner_token(text,text,text,text,text,text,integer);
drop function if exists public.list_lumareel_scanner_tokens(text);
drop function if exists public.lumareel_is_box_office();
revoke all on function public.lumareel_is_box_office(text) from public,anon,authenticated;
revoke all on function public.create_physical_ticket_batch(text,text,text,text,text,text,text,text,text,integer,text,text) from public,anon,authenticated;
revoke all on function public.create_lumareel_scanner_token(text,text,text,text,text,text,text,integer) from public,anon,authenticated;
revoke all on function public.list_lumareel_scanner_tokens(text,text) from public,anon,authenticated;
revoke all on function public.reserve_print_serials(text,integer) from public,anon,authenticated;
grant execute on function public.create_physical_ticket_batch(text,text,text,text,text,text,text,text,text,integer,text,text) to service_role;
grant execute on function public.create_lumareel_scanner_token(text,text,text,text,text,text,text,integer) to service_role;
grant execute on function public.list_lumareel_scanner_tokens(text,text) to service_role;
grant execute on function public.verify_lumareel_scanner_token(text,text) to service_role;
grant execute on function public.verify_and_check_in_physical_ticket(text,text,text,text) to service_role;
grant execute on function public.reserve_print_serials(text,integer) to service_role;
