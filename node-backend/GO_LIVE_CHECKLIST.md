# Go-Live Checklist — Node.js Backend
**Project:** Prani Backend  
**Date:** 2026-05-14  
**Target:** Replace Spring Boot 3.2.5 with Node.js 20 + Express + Prisma

---

## Section 1: Local Setup Validation

### 1.1 Dependencies
- [ ] Node.js 20+ installed (`node --version` → v20.x.x)
- [ ] npm 10+ installed (`npm --version`)
- [ ] `npm install` runs without errors in `node-backend/`
- [ ] `npx prisma generate` runs without errors

### 1.2 Database Connectivity
- [ ] `DATABASE_URL` set to Supabase connection string (pooler port 6543 for transactions)
- [ ] `DIRECT_URL` set to Supabase direct connection (port 5432 for migrations)
- [ ] `npx prisma db pull` succeeds and matches existing schema
- [ ] `npx prisma validate` shows no schema errors
- [ ] Test query: `npx prisma studio` can browse all tables

### 1.3 Environment Variables — All Required
- [ ] `DATABASE_URL` — Supabase pooler connection string
- [ ] `DIRECT_URL` — Supabase direct connection string
- [ ] `JWT_SECRET_KEY` — **Must match Spring Boot secret exactly** (32+ chars)
- [ ] `JWT_EXPIRATION_HOURS` — 168 (7 days)
- [ ] `PORT` — 8080 (or your preferred port)
- [ ] `NODE_ENV` — development (local) / production (deployed)
- [ ] `CORS_ORIGINS` — `http://localhost:3000` (local) or frontend URL (prod)
- [ ] `FRONTEND_URL` — frontend URL for QR codes and email links
- [ ] `ANTHROPIC_API_KEY` — Claude API key
- [ ] `OPENAI_API_KEY` — OpenAI API key (for DALL-E 3)
- [ ] `STRIPE_SECRET_KEY` — Stripe secret key
- [ ] `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- [ ] `STRIPE_PRICE_PRO_MONTHLY` — Stripe price ID
- [ ] `STRIPE_PRICE_PRO_YEARLY` — Stripe price ID
- [ ] `STRIPE_PRICE_ENTERPRISE_MONTHLY` — Stripe price ID
- [ ] `STRIPE_PRICE_ENTERPRISE_YEARLY` — Stripe price ID
- [ ] `PAYSTACK_SECRET_KEY` — Paystack secret key
- [ ] `RESEND_API_KEY` — Resend API key
- [ ] `RESEND_FROM_EMAIL` — From email address
- [ ] `RESEND_FROM_NAME` — From name (e.g., "Prani")
- [ ] `SUPABASE_URL` — Supabase project URL
- [ ] `SUPABASE_SERVICE_KEY` — Supabase service role key

### 1.4 Server Startup
- [ ] `npm run dev` starts without errors
- [ ] Server listens on correct port
- [ ] `GET /api/health` returns `{ status: 'healthy' }`
- [ ] `GET /` returns `{ status: 'ok', service: 'Prani API' }`

---

## Section 2: Authentication & Security

### 2.1 Registration & Login
- [ ] `POST /api/auth/register` creates user and returns JWT
- [ ] Returned JWT decodes to `{ userId, email, role, tenantId }`
- [ ] `POST /api/auth/login` validates password and returns JWT
- [ ] Invalid password returns 401 (not 500)
- [ ] Non-existent email returns 401 (not 404, to avoid user enumeration)
- [ ] Password hash uses bcryptjs (NOT plaintext)

### 2.2 JWT
- [ ] JWT expiry is 168 hours (7 days)
- [ ] JWT uses HS256 algorithm
- [ ] JWT secret is 32+ characters
- [ ] `GET /api/auth/me` with valid token returns user object
- [ ] `GET /api/auth/me` with expired token returns 401
- [ ] `GET /api/auth/me` with no token returns 401
- [ ] Impersonation token expires in 1 hour

### 2.3 MFA — TOTP
- [ ] `GET /api/auth/totp-setup` returns QR code URI and secret
- [ ] QR code URI is scannable in Google Authenticator / Authy
- [ ] `POST /api/auth/verify-totp-setup` enables MFA on user
- [ ] Login with MFA-enabled account returns `{ mfa_required: true }`
- [ ] `POST /api/auth/verify-mfa` with valid TOTP returns JWT

### 2.4 MFA — Email OTP
- [ ] `POST /api/auth/send-email-otp` sends email with 6-digit code
- [ ] OTP expires in 10 minutes
- [ ] `POST /api/auth/verify-mfa` with valid email OTP returns JWT
- [ ] Expired OTP returns 401

### 2.5 RBAC
- [ ] `super_admin` can access all endpoints
- [ ] `tenant_admin` cannot access super-admin endpoints (403)
- [ ] `staff` cannot access tenant-admin endpoints (403)
- [ ] `client` cannot access admin endpoints (403)
- [ ] Tenant isolation: tenant_admin cannot see other tenants' data

### 2.6 CORS
- [ ] Requests from `CORS_ORIGINS` succeed
- [ ] Requests from unlisted origins receive CORS error
- [ ] Preflight OPTIONS requests return 200

---

## Section 3: Core Features

### 3.1 Events
- [ ] Create event returns 201 with correct fields
- [ ] List events filters by tenantId correctly
- [ ] Event type templates populate checklist/timeline on create
- [ ] Task CRUD works correctly
- [ ] Event PDF download returns valid PDF
- [ ] Event stats returns correct counts by status

### 3.2 Inventory
- [ ] Create item generates unique QR code
- [ ] QR code lookup works
- [ ] Barcode lookup works
- [ ] Transaction: `rent` reduces available, increases rented
- [ ] Transaction: `return` reduces rented, increases available
- [ ] Transaction: `wash` reduces available, increases washing
- [ ] Cannot rent more than available quantity (validation)
- [ ] QR code PNG download returns valid image

### 3.3 Vendors & Marketplace
- [ ] Create vendor auto-creates vendor_profile
- [ ] Marketplace browse returns only `is_marketplace_active=true` profiles
- [ ] Vendor reviews update `vendor.rating` (average)
- [ ] Toggle favorite adds/removes correctly
- [ ] Vendor duplicate review prevention works (unique constraint)

### 3.4 Wedding Planner
- [ ] Create/get plan works
- [ ] Budget item CRUD works
- [ ] Guest list CRUD works
- [ ] Guest stats returns correct counts
- [ ] Venue selection: selecting one deselects all others
- [ ] Menu item CRUD works
- [ ] Design assets upload works

### 3.5 Albums
- [ ] Create album generates unique token
- [ ] Public album access by token works (no auth required)
- [ ] File upload to Supabase storage succeeds
- [ ] Album QR code links to correct URL
- [ ] ZIP download contains all media files
- [ ] Public token upload (for guests) works without auth
- [ ] Media favorite toggle works

### 3.6 Save-The-Date
- [ ] Create design works
- [ ] Photo upload to Supabase storage works
- [ ] Publish design changes status to 'published'
- [ ] AI text generation returns structured response
- [ ] AI image generation calls DALL-E 3 and returns URL

### 3.7 Staff & Shifts
- [ ] List staff filters by role='staff' and tenantId
- [ ] Create/update/delete shifts work
- [ ] Schedule endpoint filters by date range
- [ ] Staff profile update works (skills, certifications)

---

## Section 4: AI Integrations

### 4.1 Claude (Anthropic)
- [ ] `ANTHROPIC_API_KEY` is valid (test with `POST /api/ai/chat`)
- [ ] Chat returns text response
- [ ] Checklist returns JSON array
- [ ] Budget returns JSON object with categories
- [ ] Timeline returns JSON array of time-ordered items
- [ ] Seating plan returns JSON
- [ ] Vendor suggestions returns text
- [ ] Model: `claude-sonnet-4-6` confirmed in API calls

### 4.2 OpenAI (DALL-E 3)
- [ ] `OPENAI_API_KEY` is valid
- [ ] Save-the-date image generation returns image URL
- [ ] Response image URL is accessible

### 4.3 Feature Gating
- [ ] `free` plan users receive 402 on `/api/ai/*` endpoints
- [ ] `trial`/`pro`/`enterprise` users can access AI endpoints
- [ ] 402 response includes `feature_key` field
- [ ] `super_admin` bypasses all feature gates

---

## Section 5: Payments

### 5.1 Stripe
- [ ] `STRIPE_SECRET_KEY` is valid
- [ ] `POST /api/stripe/checkout` creates checkout session and returns URL
- [ ] Checkout session URL redirects to Stripe
- [ ] `POST /api/stripe/portal` creates billing portal session
- [ ] `POST /api/stripe/webhook` accepts POST with raw body
- [ ] Webhook endpoint returns 200 for valid events
- [ ] Webhook signature verification rejects invalid signatures (400)
- [ ] `checkout.session.completed` event activates subscription in DB
- [ ] `invoice.payment_failed` sets subscription status to `past_due`
- [ ] `customer.subscription.deleted` sets subscription status to `cancelled`

### 5.2 Stripe Webhook Setup (Production)
- [ ] Webhook URL configured in Stripe Dashboard: `https://yourdomain.com/api/stripe/webhook`
- [ ] Events subscribed: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`
- [ ] Signing secret copied to `STRIPE_WEBHOOK_SECRET`
- [ ] Test webhook sent and confirmed received (200 OK)

### 5.3 Subscription Plans
- [ ] `GET /api/subscriptions/plans` returns all 4 plans with features
- [ ] `GET /api/subscriptions/me` returns current user subscription
- [ ] `POST /api/subscriptions/cancel` sets `cancel_at_period_end=true`

---

## Section 6: Email

### 6.1 Resend Integration
- [ ] `RESEND_API_KEY` is valid
- [ ] OTP email sends successfully on MFA setup
- [ ] Invitation email sends on `POST /api/tenants/:id/users` (tenant admin creation)
- [ ] Welcome email sends on registration
- [ ] Password changed email sends on `POST /api/auth/change-password`
- [ ] From address matches `RESEND_FROM_EMAIL`

---

## Section 7: File Storage

### 7.1 Supabase Storage
- [ ] `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are valid
- [ ] Test upload via `POST /api/albums/:id/media` succeeds
- [ ] Uploaded file URL is publicly accessible (or signed URL works)
- [ ] Storage bucket `albums` exists in Supabase Storage
- [ ] Storage bucket `save-the-date` exists
- [ ] File deletion removes from storage (test via `DELETE /api/albums/:id/media/:mediaId`)

### 7.2 QR Codes
- [ ] Inventory item QR code PNG downloads correctly
- [ ] Album QR code PNG downloads correctly
- [ ] QR codes are scannable (test with a QR scanner app)

### 7.3 PDFs
- [ ] Event report PDF downloads correctly
- [ ] PDF contains event details, tasks, and budget
- [ ] Content-Type is `application/pdf`

---

## Section 8: Prisma & Database

### 8.1 Prisma Client
- [ ] `npx prisma generate` succeeds
- [ ] `npx prisma validate` shows no errors
- [ ] `npx prisma db pull` matches production schema
- [ ] All 30 models resolve correctly

### 8.2 Connection
- [ ] Connection pool does not exhaust under normal load
- [ ] `DATABASE_URL` uses PgBouncer pooler (port 6543) for transactions
- [ ] `DIRECT_URL` uses direct connection (port 5432) for schema operations
- [ ] SSL is enabled (`sslmode=require` in connection string)

### 8.3 Data Integrity
- [ ] No `prisma.$transaction` calls fail silently
- [ ] JSONB fields round-trip correctly (write JSON, read back same JSON)
- [ ] UUID fields are formatted correctly (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

---

## Section 9: Error Handling

### 9.1 Error Responses
- [ ] 400 returns `{ error, message }` with bad request details
- [ ] 401 returns `{ error: 'Unauthorized', message }` with no sensitive info
- [ ] 402 returns `{ error, feature_key, message }` for gated features
- [ ] 403 returns `{ error: 'Forbidden', message }`
- [ ] 404 returns `{ error: 'Not Found', message }` for missing resources
- [ ] 409 returns `{ error: 'Conflict', message }` for duplicate records
- [ ] 500 hides stack traces in production

### 9.2 Prisma Error Handling
- [ ] Duplicate unique key (P2002) returns 409 (not 500)
- [ ] Record not found (P2025) returns 404 (not 500)
- [ ] Foreign key violation (P2003) returns 409 (not 500)

---

## Section 10: Production Build & Deployment

### 10.1 Production Checklist
- [ ] `NODE_ENV=production` set in deployment environment
- [ ] `console.log` debug output suppressed (use winston logger)
- [ ] Morgan logging set to `combined` format (not `dev`)
- [ ] Helmet security headers enabled
- [ ] `pm2` or equivalent process manager configured
- [ ] Auto-restart on crash configured
- [ ] Health check probe configured in load balancer

### 10.2 Performance
- [ ] `prisma.$connect()` called on startup (not lazy)
- [ ] No memory leaks in `/api/albums/:id/download` (stream, not buffer)
- [ ] Multer uses `memoryStorage` with 100MB limit

### 10.3 Logging
- [ ] Winston logger configured (not raw `console.log` in production)
- [ ] Log level is `info` in production
- [ ] Logs include request ID for tracing
- [ ] Error stack traces logged to server (not sent to client in prod)

### 10.4 Monitoring
- [ ] `/api/health` returns 200 (used by uptime monitors)
- [ ] Set up Uptime Robot / Better Uptime to ping `/api/health` every 5 minutes
- [ ] Set up alerting on 5xx error spike
- [ ] Set up alerting on `/api/stripe/webhook` failures

---

## Section 11: Frontend Integration

### 11.1 API Compatibility
- [ ] Frontend's `api.js`/axios base URL updated to Node.js backend URL
- [ ] All API calls use same paths as before (no path changes)
- [ ] Authorization header format unchanged: `Bearer <token>`
- [ ] Response shapes match: `{ data: ... }` wrapper
- [ ] Error shapes match: `{ error, message }` wrapper

### 11.2 Critical User Flows to Test
- [ ] User can register and log in
- [ ] User with MFA can complete MFA flow
- [ ] User can create and manage events
- [ ] Vendor marketplace browsing works (public, no auth)
- [ ] Album guest upload works (public token, no auth)
- [ ] Subscription upgrade with Stripe works end-to-end
- [ ] Save-the-date AI generation works
- [ ] Admin dashboard loads

---

## Final Sign-Off

| Item | Approved By | Date |
|---|---|---|
| Backend deployment verified | | |
| Frontend integration tested | | |
| Stripe webhooks re-configured | | |
| All environment variables set | | |
| Database connectivity confirmed | | |
| Security review passed | | |
| **Go-live approved** | | |
