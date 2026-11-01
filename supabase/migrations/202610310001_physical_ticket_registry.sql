-- LUMARÉEL CO. — registre durable des billets physiques et des contrôles
-- À exécuter une seule fois dans Supabase SQL Editor avant le déploiement des fonctions Vercel.

CREATE TABLE IF NOT EXISTS public.physical_ticket_batches (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'LUMARÉEL CO.'
);

CREATE TABLE IF NOT EXISTS public.physical_ticket_serial_counters (
  serial_year INTEGER PRIMARY KEY,
  last_value BIGINT NOT NULL DEFAULT 0 CHECK (last_value >= 0)
);

CREATE TABLE IF NOT EXISTS public.physical_ticket_scan_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id TEXT,
  token_or_serial TEXT NOT NULL,
  event_id TEXT,
  agent_name TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('SUCCESS','ALREADY_USED','INVALID','CANCELLED','WRONG_EVENT')),
  message TEXT NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ticket_serial TEXT,
  ticket_holder TEXT
);

CREATE INDEX IF NOT EXISTS idx_physical_scan_event_time
  ON public.physical_ticket_scan_logs(event_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_physical_scan_ticket
  ON public.physical_ticket_scan_logs(ticket_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_physical_batches_event_time
  ON public.physical_ticket_batches(event_id, created_at DESC);

ALTER TABLE public.physical_ticket_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_ticket_serial_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_ticket_scan_logs ENABLE ROW LEVEL SECURITY;
-- Aucune politique publique : accès réservé aux fonctions SECURITY DEFINER et au service_role.

CREATE OR REPLACE FUNCTION public.create_physical_ticket_batch(
  p_event_id TEXT,
  p_category_id TEXT,
  p_quantity INTEGER,
  p_created_by TEXT DEFAULT 'LUMARÉEL CO.'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.events%ROWTYPE;
  v_category JSONB;
  v_year INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
  v_artist_code TEXT;
  v_batch_id TEXT := 'prt_' || encode(gen_random_bytes(8), 'hex');
  v_batch_ref TEXT := 'LMR-LOT-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 10));
  v_order_ref TEXT;
  v_start BIGINT;
  v_price NUMERIC(12,2);
  v_currency TEXT;
  v_ticket JSONB;
  v_tickets JSONB := '[]'::jsonb;
  v_i INTEGER;
  v_serial TEXT;
  v_token TEXT;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 10000 THEN
    RAISE EXCEPTION 'La quantité doit être comprise entre 1 et 10 000 billets.';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Concert introuvable.'; END IF;

  SELECT item INTO v_category
  FROM jsonb_array_elements(COALESCE(v_event.categories, '[]'::jsonb)) AS categories(item)
  WHERE item->>'id' = p_category_id
  LIMIT 1;
  IF v_category IS NULL THEN RAISE EXCEPTION 'Catégorie de billet introuvable.'; END IF;

  v_price := COALESCE(NULLIF(v_category->>'price','')::NUMERIC, 0);
  v_currency := COALESCE(NULLIF(v_category->>'currency',''), 'XOF');
  v_artist_code := COALESCE(NULLIF(left(regexp_replace(upper(v_event.artist), '[^A-Z]', '', 'g'), 3), ''), 'LMR');

  INSERT INTO public.physical_ticket_serial_counters(serial_year,last_value)
  VALUES (v_year, p_quantity)
  ON CONFLICT (serial_year) DO UPDATE
    SET last_value = public.physical_ticket_serial_counters.last_value + p_quantity
  RETURNING last_value - p_quantity + 1 INTO v_start;

  v_order_ref := v_batch_ref;
  INSERT INTO public.orders (
    id, reference, customer_id, customer_name, customer_email, customer_phone,
    event_id, event_title, event_date, event_venue, category_id, category_name,
    quantity, unit_price, total_amount, currency, payment_status, payment_provider, payment_ref
  ) VALUES (
    v_batch_id, v_order_ref, 'physical_batch', 'Billetterie physique LUMARÉEL', '',
    NULL, v_event.id, v_event.title, v_event.date::text, v_event.venue,
    p_category_id, COALESCE(v_category->>'name','Billet physique'),
    p_quantity, v_price, v_price * p_quantity, v_currency,
    'completed', 'physical', v_batch_ref
  );

  INSERT INTO public.physical_ticket_batches(
    id, reference, event_id, category_id, category_name, quantity, created_by
  ) VALUES (
    v_batch_id, v_batch_ref, v_event.id, p_category_id,
    COALESCE(v_category->>'name','Billet physique'), p_quantity,
    COALESCE(NULLIF(p_created_by,''),'LUMARÉEL CO.')
  );

  FOR v_i IN 0..p_quantity-1 LOOP
    v_serial := format('LMR-%s-%s-P%s', v_year, v_artist_code, lpad((v_start + v_i)::text, 7, '0'));
    v_token := 'TKT_SEC_' || upper(encode(gen_random_bytes(16), 'hex'));
    INSERT INTO public.tickets (
      id, order_id, order_ref, event_id, event_title, event_date, event_time,
      event_venue, category_id, category_name, serial_number, token,
      holder_name, holder_email, status, issued_at
    ) VALUES (
      'tkt_' || encode(gen_random_bytes(10), 'hex'), v_batch_id, v_batch_ref,
      v_event.id, v_event.title, v_event.date::text, v_event.time, v_event.venue,
      p_category_id, COALESCE(v_category->>'name','Billet physique'),
      v_serial, v_token, 'Billet physique', '', 'valid', NOW()
    ) RETURNING jsonb_build_object('id',id,'serialNumber',serial_number,'token',token) INTO v_ticket;
    v_tickets := v_tickets || jsonb_build_array(v_ticket);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true, 'batchRef', v_batch_ref, 'tickets', v_tickets,
    'quantity', p_quantity, 'eventId', v_event.id, 'categoryId', p_category_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_and_check_in_ticket(
  p_token TEXT,
  p_event_id TEXT,
  p_agent_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_result TEXT;
  v_message TEXT;
  v_response JSONB;
BEGIN
  SELECT * INTO v_ticket
  FROM public.tickets
  WHERE token = p_token OR serial_number = upper(p_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    v_result := 'INVALID';
    v_message := 'Billet introuvable ou faux code QR.';
    v_response := jsonb_build_object('valid',false,'status',v_result,'error',v_message);
  ELSIF p_event_id IS NOT NULL AND v_ticket.event_id <> p_event_id THEN
    v_result := 'WRONG_EVENT';
    v_message := 'Ce billet est pour un autre concert.';
    v_response := jsonb_build_object('valid',false,'status',v_result,'message',v_message,'eventTitle',v_ticket.event_title);
  ELSIF v_ticket.status = 'used' THEN
    v_result := 'ALREADY_USED';
    v_message := 'BILLET DÉJÀ UTILISÉ. REFUS D’ACCÈS.';
    v_response := jsonb_build_object('valid',false,'status',v_result,'message',v_message,
      'holderName',v_ticket.holder_name,'categoryName',v_ticket.category_name,
      'eventTitle',v_ticket.event_title,'serialNumber',v_ticket.serial_number,
      'scannedAt',v_ticket.checked_in_at,'checkedInBy',v_ticket.checked_in_by);
  ELSIF v_ticket.status = 'cancelled' THEN
    v_result := 'CANCELLED';
    v_message := 'Ce billet a été annulé ou remboursé.';
    v_response := jsonb_build_object('valid',false,'status',v_result,'message',v_message);
  ELSE
    UPDATE public.tickets SET status='used', checked_in_at=v_now, checked_in_by=COALESCE(NULLIF(p_agent_name,''),'Agent de contrôle')
    WHERE id=v_ticket.id;
    v_result := 'SUCCESS';
    v_message := 'ACCÈS AUTORISÉ';
    v_response := jsonb_build_object('valid',true,'status',v_result,'message',v_message,
      'holderName',v_ticket.holder_name,'categoryName',v_ticket.category_name,
      'eventTitle',v_ticket.event_title,'serialNumber',v_ticket.serial_number,'scannedAt',v_now);
  END IF;

  INSERT INTO public.physical_ticket_scan_logs(
    ticket_id, token_or_serial, event_id, agent_name, result, message,
    scanned_at, ticket_serial, ticket_holder
  ) VALUES (
    CASE WHEN v_ticket.id IS NULL THEN NULL ELSE v_ticket.id END,
    left(COALESCE(p_token,''),160), COALESCE(p_event_id,v_ticket.event_id),
    COALESCE(NULLIF(p_agent_name,''),'Agent de contrôle'), v_result, v_message,
    v_now, v_ticket.serial_number, v_ticket.holder_name
  );
  RETURN v_response;
END;
$$;

REVOKE ALL ON FUNCTION public.create_physical_ticket_batch(TEXT,TEXT,INTEGER,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_physical_ticket_batch(TEXT,TEXT,INTEGER,TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.verify_and_check_in_ticket(TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_and_check_in_ticket(TEXT,TEXT,TEXT) TO service_role;
