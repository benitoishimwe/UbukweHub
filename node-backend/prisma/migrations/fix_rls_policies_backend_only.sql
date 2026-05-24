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
-- Safe to re-run (IF NOT EXISTS / OR REPLACE).
-- ============================================================

CREATE POLICY IF NOT EXISTS "backend_only" ON public.album_media
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.albums
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.api_keys
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.audit_logs
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.email_otps
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.event_tasks
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.event_types
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.events
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.inventory
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.messages
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.notifications
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.payments
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.prani_schema_history
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.save_the_date_designs
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.shifts
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.subscription_features
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.subscriptions
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.tenant_invitations
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.tenants
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.test_accounts
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.transactions
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.user_sessions
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.users
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.vendor_analytics
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.vendor_favorites
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.vendor_inquiries
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.vendor_onboarding
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.vendor_portfolio
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.vendor_profiles
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.vendor_reviews
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.vendors
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.wedding_budget_items
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.wedding_design_assets
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.wedding_guests
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.wedding_menu_items
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.wedding_plans
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "backend_only" ON public.wedding_venues
  TO service_role USING (true) WITH CHECK (true);

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
