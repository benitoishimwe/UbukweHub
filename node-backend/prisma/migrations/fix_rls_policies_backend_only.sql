-- ============================================================
-- Fix: Add explicit service_role-only RLS policies to silence
--      "RLS Enabled No Policy" linter warnings.
--
-- Why this works:
--   - TO service_role limits the policy to that role only
--   - service_role already bypasses RLS — this is a no-op in practice
--   - Restricting to service_role means it won't trigger "policy always true"
--     (that warning only fires when ALL roles get USING (true))
--   - anon/authenticated roles still have no policy → still blocked from PostgREST
--
-- Safe to re-run: DROP IF EXISTS before each CREATE.
-- ============================================================

DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'album_media','albums','api_keys','audit_logs','email_otps',
    'event_tasks','event_types','events','inventory','messages',
    'notifications','payments','prani_schema_history','save_the_date_designs',
    'shifts','subscription_features','subscriptions','tenant_invitations',
    'tenants','test_accounts','transactions','user_sessions','users',
    'vendor_analytics','vendor_favorites','vendor_inquiries','vendor_onboarding',
    'vendor_portfolio','vendor_profiles','vendor_reviews','vendors',
    'wedding_budget_items','wedding_design_assets','wedding_guests',
    'wedding_menu_items','wedding_plans','wedding_venues'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS backend_only ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY backend_only ON public.%I TO service_role USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- ─── Verify: should return 0 rows (every table has at least one policy) ───────
SELECT schemaname, tablename
FROM pg_tables t
WHERE schemaname = 'public'
  AND rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = t.schemaname
      AND p.tablename  = t.tablename
  )
ORDER BY tablename;
