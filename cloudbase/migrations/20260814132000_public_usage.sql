-- SIGS-OGLab public AI quota and anonymous visit aggregates.
-- Privacy boundary: only a server-side HMAC digest, date, counters and region
-- aggregates are stored. Raw IP addresses and engineering data never enter
-- these tables.

CREATE TABLE IF NOT EXISTS public.sigs_ai_daily_quota (
  visitor_hash text NOT NULL CHECK (visitor_hash ~ '^[0-9a-f]{64}$'),
  quota_date date NOT NULL,
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (visitor_hash, quota_date)
);

CREATE TABLE IF NOT EXISTS public.sigs_visitor_identity (
  visitor_hash text PRIMARY KEY CHECK (visitor_hash ~ '^[0-9a-f]{64}$'),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sigs_visit_totals (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  visitors bigint NOT NULL DEFAULT 0 CHECK (visitors >= 0),
  visits bigint NOT NULL DEFAULT 0 CHECK (visits >= 0)
);

CREATE TABLE IF NOT EXISTS public.sigs_visit_regions (
  region_key text PRIMARY KEY CHECK (region_key ~ '^(UNKNOWN|[A-Z]{2}(-[A-Z0-9]{1,3})?)$'),
  visits bigint NOT NULL DEFAULT 0 CHECK (visits >= 0)
);

INSERT INTO public.sigs_visit_totals (singleton, visitors, visits)
VALUES (true, 0, 0)
ON CONFLICT (singleton) DO NOTHING;

ALTER TABLE public.sigs_ai_daily_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sigs_visitor_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sigs_visit_totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sigs_visit_regions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.sigs_ai_daily_quota FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.sigs_visitor_identity FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.sigs_visit_totals FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.sigs_visit_regions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sigs_ai_daily_quota TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sigs_visitor_identity TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sigs_visit_totals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sigs_visit_regions TO service_role;

CREATE OR REPLACE FUNCTION public.sigs_require_service_role()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  claims jsonb;
BEGIN
  BEGIN
    claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  EXCEPTION WHEN others THEN
    claims := NULL;
  END;
  IF COALESCE(claims->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sigs_quota_read(
  p_subject text,
  p_quota_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_used integer;
BEGIN
  PERFORM public.sigs_require_service_role();
  IF p_subject !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid subject' USING ERRCODE = '22023';
  END IF;
  SELECT used INTO v_used
  FROM public.sigs_ai_daily_quota
  WHERE visitor_hash = p_subject AND quota_date = p_quota_date;
  RETURN jsonb_build_object('used', COALESCE(v_used, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.sigs_quota_reserve(
  p_subject text,
  p_quota_date date,
  p_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_used integer;
  v_accepted boolean := false;
BEGIN
  PERFORM public.sigs_require_service_role();
  IF p_subject !~ '^[0-9a-f]{64}$' OR p_limit < 1 OR p_limit > 10000 THEN
    RAISE EXCEPTION 'invalid quota input' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.sigs_ai_daily_quota (visitor_hash, quota_date, used, updated_at)
  VALUES (p_subject, p_quota_date, 1, now())
  ON CONFLICT (visitor_hash, quota_date) DO UPDATE
    SET used = public.sigs_ai_daily_quota.used + 1,
        updated_at = now()
    WHERE public.sigs_ai_daily_quota.used < p_limit
  RETURNING used, true INTO v_used, v_accepted;

  IF v_used IS NULL THEN
    SELECT used INTO v_used
    FROM public.sigs_ai_daily_quota
    WHERE visitor_hash = p_subject AND quota_date = p_quota_date;
  END IF;
  RETURN jsonb_build_object('accepted', v_accepted, 'used', COALESCE(v_used, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.sigs_quota_release(
  p_subject text,
  p_quota_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_used integer;
BEGIN
  PERFORM public.sigs_require_service_role();
  IF p_subject !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid subject' USING ERRCODE = '22023';
  END IF;

  UPDATE public.sigs_ai_daily_quota
  SET used = GREATEST(used - 1, 0), updated_at = now()
  WHERE visitor_hash = p_subject AND quota_date = p_quota_date
  RETURNING used INTO v_used;

  IF COALESCE(v_used, 0) = 0 THEN
    DELETE FROM public.sigs_ai_daily_quota
    WHERE visitor_hash = p_subject AND quota_date = p_quota_date AND used = 0;
  END IF;
  RETURN jsonb_build_object('used', COALESCE(v_used, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.sigs_record_visit(
  p_subject text,
  p_region_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_new boolean;
  v_visitors bigint;
  v_visits bigint;
  v_regions jsonb;
BEGIN
  PERFORM public.sigs_require_service_role();
  IF p_subject !~ '^[0-9a-f]{64}$'
     OR p_region_key !~ '^(UNKNOWN|[A-Z]{2}(-[A-Z0-9]{1,3})?)$' THEN
    RAISE EXCEPTION 'invalid analytics input' USING ERRCODE = '22023';
  END IF;

  WITH inserted AS (
    INSERT INTO public.sigs_visitor_identity (visitor_hash, first_seen_at, last_seen_at)
    VALUES (p_subject, now(), now())
    ON CONFLICT (visitor_hash) DO NOTHING
    RETURNING 1
  )
  SELECT EXISTS(SELECT 1 FROM inserted) INTO v_is_new;

  IF NOT v_is_new THEN
    UPDATE public.sigs_visitor_identity SET last_seen_at = now()
    WHERE visitor_hash = p_subject;
  END IF;

  INSERT INTO public.sigs_visit_totals (singleton, visitors, visits)
  VALUES (true, CASE WHEN v_is_new THEN 1 ELSE 0 END, 1)
  ON CONFLICT (singleton) DO UPDATE
    SET visitors = public.sigs_visit_totals.visitors + CASE WHEN v_is_new THEN 1 ELSE 0 END,
        visits = public.sigs_visit_totals.visits + 1
  RETURNING visitors, visits INTO v_visitors, v_visits;

  INSERT INTO public.sigs_visit_regions (region_key, visits)
  VALUES (p_region_key, 1)
  ON CONFLICT (region_key) DO UPDATE
    SET visits = public.sigs_visit_regions.visits + 1;

  SELECT COALESCE(jsonb_object_agg(region_key, visits), '{}'::jsonb)
  INTO v_regions
  FROM public.sigs_visit_regions;

  RETURN jsonb_build_object(
    'visitors', v_visitors,
    'visits', v_visits,
    'regions', v_regions
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sigs_require_service_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sigs_quota_read(text, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sigs_quota_reserve(text, date, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sigs_quota_release(text, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sigs_record_visit(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sigs_require_service_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.sigs_quota_read(text, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.sigs_quota_reserve(text, date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.sigs_quota_release(text, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.sigs_record_visit(text, text) TO service_role;
