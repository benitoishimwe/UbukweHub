# Prani — Full Application Documentation

> AI-powered event planning SaaS platform for African event planners, built for weddings, corporate events, birthdays, conferences, and private parties.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Directory Structure](#3-directory-structure)
4. [Environment Variables](#4-environment-variables)
5. [Database](#5-database)
6. [Data Models (Entities)](#6-data-models-entities)
7. [API Reference](#7-api-reference)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Multi-Tenant Architecture](#9-multi-tenant-architecture)
10. [Business Logic & Services](#10-business-logic--services)
11. [Frontend Pages & Components](#11-frontend-pages--components)
12. [Subscription Plans & Feature Gating](#12-subscription-plans--feature-gating)
13. [Third-Party Integrations](#13-third-party-integrations)
14. [Offline Support](#14-offline-support)
15. [Deployment Notes](#15-deployment-notes)

---

## 1. Project Overview

**UbukweHub** (product name: **Prani**) is a multi-tenant SaaS platform that lets event planning businesses manage every aspect of their work. The platform owner (Archives company) sells it as a product; each subscribing business is a **tenant** with fully isolated data.

Core capabilities:

- End-to-end event management (tasks, timelines, checklists, budgets, seating, guest lists)
- AI assistant powered by Anthropic Claude for intelligent planning suggestions
- Vendor marketplace for finding and booking event vendors
- Inventory and equipment tracking with QR code support
- Staff shift scheduling and management
- Guest photo/video album sharing via secure token-protected links
- AI-generated save-the-date card images via OpenAI DALL-E 3
- Subscription-based access (Free / Trial / Pro / Enterprise) with Stripe and Paystack payments
- Admin dashboard with audit logs and user management
- Wedding-specific planner (guests, budget items, venue, menu, seating)
- Super-admin panel for platform-wide tenant and user management

---

## 2. Tech Stack

### Backend

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Framework | Express 4.19 |
| ORM | Prisma 5.16 (Supabase PostgreSQL) |
| Authentication | JWT (`jsonwebtoken`) + bcryptjs |
| AI | Anthropic Claude SDK (`@anthropic-ai/sdk`) — `claude-sonnet-4-6` |
| Image Generation | OpenAI SDK — DALL-E 3 |
| Email | Resend SDK (`resend`) |
| Payments | Stripe SDK (`stripe`) + Paystack |
| PDF Export | PDFKit |
| QR Codes | `qrcode` |
| MFA (TOTP) | `otplib` |
| File uploads | Multer |
| ZIP archives | Archiver |
| Storage | Supabase Storage (`@supabase/supabase-js`) |
| Security | Helmet |
| Logging | Winston + Morgan |
| Validation | express-validator |

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | React 19.0.0 |
| Routing | React Router 7.5.1 |
| UI Components | Radix UI (comprehensive primitives) |
| Styling | TailwindCSS 3.4.17, Tailwind Merge, Tailwind Animate |
| Forms | React Hook Form 7.56.2 + Zod validation |
| Charts | Recharts 3.6.0 |
| Animations | Framer Motion 12.34.3 |
| Drag & Drop | dnd-kit (core + sortable) |
| Notifications | Sonner (toast library) |
| Date/Time | date-fns 4.1.0, React Day Picker |
| Offline | Service Workers + IndexedDB (idb) |
| HTTP Client | Axios |
| Build | Create React App + craco |
| Package Manager | Yarn 1.22.22 |

---

## 3. Directory Structure

```
UbukweHub/
├── node-backend/                         # Node.js backend (active)
│   ├── src/
│   │   ├── index.js                      # HTTP server entry point + graceful shutdown
│   │   ├── app.js                        # Express app setup, middleware, dynamic route loading
│   │   ├── config/
│   │   │   ├── env.js                    # Validated environment configuration
│   │   │   ├── prisma.js                 # Prisma client singleton
│   │   │   └── supabase.js               # Supabase client (file storage)
│   │   ├── middleware/
│   │   │   ├── auth.js                   # JWT authentication middleware
│   │   │   ├── rbac.js                   # Role-based access control
│   │   │   ├── featureGate.js            # Subscription feature gating
│   │   │   └── errorHandler.js           # Centralised error handler + AppError
│   │   ├── routes/                       # 19 route modules — auto-mounted at /api/<name>
│   │   │   ├── auth.routes.js
│   │   │   ├── event.routes.js
│   │   │   ├── inventory.routes.js
│   │   │   ├── transaction.routes.js
│   │   │   ├── staff.routes.js
│   │   │   ├── vendor.routes.js
│   │   │   ├── marketplace.routes.js
│   │   │   ├── album.routes.js
│   │   │   ├── weddingPlanner.routes.js
│   │   │   ├── saveTheDate.routes.js
│   │   │   ├── ai.routes.js
│   │   │   ├── stripe.routes.js
│   │   │   ├── upload.routes.js
│   │   │   ├── subscription.routes.js
│   │   │   ├── admin.routes.js
│   │   │   ├── tenant.routes.js
│   │   │   ├── superAdmin.routes.js
│   │   │   ├── health.routes.js
│   │   │   └── index.js                  # Route manifest
│   │   ├── services/                     # 19 business-logic services
│   │   └── utils/                        # jwt.js, totp.js, response.js, qrcode.js, pdf.js
│   ├── .env.example
│   ├── package.json
│   ├── MIGRATION_VERIFICATION_REPORT.md
│   ├── GO_LIVE_CHECKLIST.md
│   └── README.md
│
├── frontend/                             # React application
│   ├── src/
│   │   ├── App.js                        # Root router + providers
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── AuthCallback.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── EventsPage.jsx
│   │   │   ├── InventoryPage.jsx
│   │   │   ├── TransactionsPage.jsx
│   │   │   ├── StaffPage.jsx
│   │   │   ├── VendorsPage.jsx
│   │   │   ├── AIAssistantPage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── AdminPage.jsx
│   │   │   ├── PricingPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   ├── AlbumGalleryPage.jsx
│   │   │   ├── GuestUploadPage.jsx
│   │   │   ├── PlannerPage.jsx
│   │   │   ├── SaveTheDatePage.jsx
│   │   │   ├── MarketplacePage.jsx
│   │   │   ├── AcceptInvitationPage.jsx  # Token-based invitation accept
│   │   │   ├── OnboardingWizardPage.jsx  # 4-step new-tenant onboarding
│   │   │   ├── planner/                  # Wedding planner tabs
│   │   │   └── super-admin/              # Super-admin panel pages
│   │   │       ├── SuperAdminDashboard.jsx
│   │   │       ├── TenantsPage.jsx
│   │   │       ├── TenantDetailsPage.jsx
│   │   │       └── AuditLogsPage.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── events/
│   │   │   ├── planner/
│   │   │   ├── onboarding/
│   │   │   ├── subscription/
│   │   │   └── ui/                       # Radix UI wrappers (30+ primitives)
│   │   ├── contexts/
│   │   │   ├── AuthContext.js            # user, token, tenantId, isSuperAdmin, isTenantAdmin
│   │   │   ├── LanguageContext.js
│   │   │   └── SubscriptionContext.js
│   │   ├── services/
│   │   │   ├── api.js                    # Axios instance + all API client groups
│   │   │   └── offline.js                # Service worker + IndexedDB
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── i18n/                         # en.json, rw.json (Kinyarwanda)
│   ├── package.json
│   └── public/
│       └── service-worker.js
│
├── prani-backend/                        # DEPRECATED — original Spring Boot backend
│   └── ...                               # Do not modify; kept for reference only
│
├── .env.example
├── design_guidelines.json
├── auth_testing.md
├── DOCUMENTATION.md                      # This file
└── test_reports/
```

---

## 4. Environment Variables

### Backend (`node-backend/.env`)

```env
# Database (Supabase PostgreSQL — Prisma connection strings)
DATABASE_URL=postgresql://user:password@host:6543/postgres?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://user:password@host:5432/postgres?sslmode=require

# Server
PORT=8080
NODE_ENV=development

# JWT
JWT_SECRET_KEY=<min-32-char-secret>
JWT_EXPIRATION_HOURS=168

# Anthropic Claude AI
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (DALL-E image generation)
OPENAI_API_KEY=sk-...

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...

# Paystack (Africa/Rwanda Payments)
PAYSTACK_SECRET_KEY=sk_live_...

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@prani.app
RESEND_FROM_NAME=Prani

# Supabase Storage (file uploads)
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:3000

# App
FRONTEND_URL=http://localhost:3000
PUBLIC_DIR=./public
```

### Frontend (`.env`)

```env
REACT_APP_BACKEND_URL=http://localhost:8080
REACT_APP_SUPABASE_URL=https://<project-id>.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
```

---

## 5. Database

### Engine

PostgreSQL managed by **Supabase**, accessed via **Prisma ORM**.

- Transaction-mode connection (PgBouncer, port 6543) via `DATABASE_URL`
- Direct connection (port 5432) via `DIRECT_URL` for Prisma migrations

### Schema Management

Prisma manages the schema (`node-backend/prisma/schema.prisma`). Run migrations with:

```bash
npx prisma migrate deploy   # apply pending migrations
npx prisma generate         # regenerate Prisma Client after schema changes
npx prisma studio           # visual database browser
```

### Key Tables

| Table | Description |
|-------|-------------|
| `tenants` | Platform tenants (organisations) |
| `users` | All system users, scoped to a tenant |
| `events` | Planned events |
| `event_tasks` | Tasks per event |
| `event_types` | Checklist/timeline/budget templates |
| `subscriptions` | User subscription records |
| `subscription_features` | Feature availability matrix per plan |
| `vendors` | Vendor directory |
| `vendor_profiles` | Extended marketplace profiles |
| `vendor_reviews` | Star-rated reviews |
| `inventory_items` | Physical equipment |
| `transactions` | Inventory movement log |
| `shifts` | Staff shift schedules |
| `albums` | Guest photo/video albums |
| `album_media` | Files within an album |
| `save_the_date_designs` | AI-generated card designs |
| `wedding_plans` | Wedding-specific plan records |
| `wedding_guests` | Wedding guest + RSVP |
| `budget_items` | Budget line items |
| `wedding_venues` | Venue options |
| `wedding_menu_items` | Catering menu |
| `wedding_design_assets` | Visual theme (colors, fonts) |
| `audit_logs` | Immutable audit trail |
| `email_otps` | One-time email verification codes |
| `tenant_invitations` | Pending team invitations (TTL 48 h) |

### JSONB Columns

Several event columns store nested data as JSONB:

- `events.checklist` — task hierarchy
- `events.timeline` — event-day schedule
- `events.seating_plan` — table-to-guest mappings
- `events.guest_list` — RSVP status + meal choices
- `events.budget_breakdown` — category allocations

---

## 6. Data Models (Entities)

### Tenant

Represents a subscribing organisation on the platform.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | String | Organisation name |
| slug | String | Unique URL slug |
| subdomain | String? | Custom subdomain |
| primaryColor | String? | Brand colour |
| isActive | Boolean | Active flag (soft disable) |
| createdAt / updatedAt | Timestamp | Audit timestamps |

**Special values:**
- Platform root tenant: `00000000-0000-0000-0000-000000000001`
- First real tenant: `00000000-0000-0000-0000-000000000002`

---

### User

All system users, always scoped to a tenant.

| Field | Type | Description |
|-------|------|-------------|
| userId | UUID | Primary key |
| tenantId | UUID | Owning tenant |
| email | String | Unique login email |
| name | String | Display name |
| role | Enum | `super_admin`, `tenant_admin`, `staff`, `client`, `vendor` |
| passwordHash | String | BCrypt hash (never returned) |
| googleId | String? | Google OAuth ID |
| mfaEnabled | Boolean | MFA active flag |
| mfaSecret | String? | TOTP secret (never returned) |
| skills | String[] | Staff skill tags |
| certifications | String[] | Staff certifications |
| availability | String? | Staff availability string |
| isActive | Boolean | Soft delete flag |
| createdAt / updatedAt | Timestamp | Audit timestamps |

---

### TenantInvitation

Email-based invitation to join a tenant.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Target tenant |
| email | String | Invitee email |
| role | String | Role to assign on acceptance |
| invitedBy | UUID | Inviting user ID |
| token | UUID | Unique accept token |
| expiresAt | Timestamp | Expiry (48 hours from creation) |
| acceptedAt | Timestamp? | Set when invitation is accepted |

---

### Event

Core entity for planned events.

| Field | Type | Description |
|-------|------|-------------|
| eventId | UUID | Primary key |
| tenantId | UUID | Owning tenant |
| name | String | Event name |
| eventDate | Date | Scheduled date |
| venue | String? | Location |
| clientId | UUID | Owning user |
| status | Enum | `upcoming`, `completed`, `cancelled` |
| budget | Decimal? | Total budget |
| guestCount | Integer? | Expected guest count |
| greatnessScore | Integer? | AI readiness score (0–100) |
| eventTypeSlug | String? | Links to EventType template |
| checklist | JSONB | Task list |
| timeline | JSONB | Event-day schedule |
| seatingPlan | JSONB | Seating arrangement |
| guestList | JSONB | Guest RSVP data |
| budgetBreakdown | JSONB | Budget categories |

---

### Other Entities

The remaining entities are unchanged in purpose from the previous version. All now carry a `tenantId` for data isolation:

- **EventType** — Template checklists, timelines, and budget categories per event category
- **EventTask** — Individual planning tasks (`todo`, `in_progress`, `done`) with priority and assignee
- **Subscription** — User subscription with plan, status, and Stripe/Paystack references
- **SubscriptionFeature** — Feature availability matrix per plan
- **Vendor / VendorProfile / VendorReview** — Vendor directory and marketplace listings
- **InventoryItem / Transaction** — Equipment tracking with QR/barcode and movement log
- **Shift** — Staff shift schedules linked to events
- **Album / AlbumMedia** — Guest photo/video albums with secure public upload tokens
- **SaveTheDateDesign** — DALL-E generated save-the-date cards
- **WeddingPlan / WeddingGuest / BudgetItem / WeddingVenue / WeddingMenuItem / WeddingDesignAsset** — Wedding-specific sub-entities
- **AuditLog** — Immutable `CREATE / UPDATE / DELETE / LOGIN` log for all major resources
- **EmailOtp** — 6-digit one-time codes for email MFA

---

## 7. API Reference

**Base URL:** `http://localhost:8080` (development) / `https://api.prani.app` (production)

All endpoints require `Authorization: Bearer <jwt_token>` unless marked **[public]**.

Allowed request headers: `Content-Type`, `Authorization`, `X-Session-Token`, `X-Tenant-ID`

---

### Authentication — `/api/auth`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register new user account |
| POST | `/login` | Login with email + password → JWT |
| POST | `/verify-mfa` | Verify TOTP or email OTP code |
| POST | `/send-email-otp` | Send email OTP for MFA |
| GET | `/me` | Get current authenticated user profile |
| POST | `/logout` | Invalidate session |
| GET | `/totp-setup` | Initialize TOTP (returns QR code URI) |
| POST | `/verify-totp-setup` | Confirm TOTP is configured |
| POST | `/change-password` | Change password (requires current password) |
| POST | `/google` | Exchange Supabase `session_id` → JWT |
| GET | `/invitation/:token` | **[public]** Preview invitation details |
| POST | `/accept-invitation` | **[public]** Accept invitation and create account |

---

### Events — `/api/events`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List events (paginated; filters: status, type, search) |
| GET | `/stats` | Event counts by status |
| GET | `/types` | List event type templates |
| GET | `/:id` | Get single event |
| GET | `/:id/report` | Download PDF event report |
| POST | `/` | Create event |
| PUT | `/:id` | Update event |
| DELETE | `/:id` | Delete event |
| GET | `/:id/tasks` | List event tasks |
| POST | `/:id/tasks` | Create task |
| PUT | `/:id/tasks/:taskId` | Update task |
| DELETE | `/:id/tasks/:taskId` | Delete task |
| PUT | `/:id/guests` | Replace guest list (JSONB) |
| PUT | `/:id/seating` | Replace seating plan (JSONB) |
| PUT | `/:id/budget` | Replace budget breakdown (JSONB) |

---

### AI Assistant — `/api/ai`

All endpoints require Pro/Enterprise subscription.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat` | Conversational AI assistant (Claude) |
| POST | `/checklist` | Generate event checklist |
| POST | `/budget` | Generate budget breakdown (RWF-aware) |
| POST | `/timeline` | Generate event-day timeline |
| POST | `/seating` | Generate seating arrangement |
| POST | `/vendors` | Suggest vendor types |
| POST | `/greatness` | Calculate event readiness score (0–100) |

---

### Vendors — `/api/vendors`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List vendors (filters: category, search) |
| GET | `/:id` | Get vendor details |
| POST | `/` | Create vendor |
| PUT | `/:id` | Update vendor |
| DELETE | `/:id` | Soft delete vendor |

---

### Vendor Marketplace — `/api/marketplace`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/vendors` | **[public]** Browse marketplace |
| GET | `/categories` | **[public]** List categories |
| GET | `/vendors/:id` | **[public]** Vendor detail + profile |
| GET | `/vendors/:id/reviews` | **[public]** Paginated reviews |
| POST | `/vendors/:id/inquire` | Send vendor inquiry |
| POST | `/vendors/:id/review` | Leave vendor review |
| GET | `/favorites` | Get user's favourite vendors |
| POST | `/favorites/:vendorId` | Add to favourites |
| DELETE | `/favorites/:vendorId` | Remove from favourites |

---

### Inventory — `/api/inventory`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List inventory (filters: category, condition, search) |
| GET | `/categories` | Get available categories |
| GET | `/stats` | Inventory statistics |
| GET | `/scan/:code` | Look up item by QR code or barcode |
| GET | `/:id` | Get item details |
| POST | `/` | Create inventory item |
| PUT | `/:id` | Update inventory item |
| DELETE | `/:id` | Soft delete item |

---

### Transactions — `/api/transactions`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List transactions (filters: type, item, event, staff) |
| GET | `/stats` | Transaction statistics |
| GET | `/:id` | Get transaction |
| POST | `/` | Create transaction |
| PUT | `/:id` | Update transaction |

---

### Staff — `/api/staff`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List staff (paginated, searchable) |
| GET | `/stats` | Staff statistics |
| GET | `/me/shifts` | Current user's upcoming shifts |
| GET | `/:userId` | Get staff member profile |
| PUT | `/:userId` | Update staff profile |
| GET | `/shifts/all` | All shifts (filters: event, date) |
| POST | `/shifts` | Create shift |
| PUT | `/shifts/:shiftId` | Update shift |
| DELETE | `/shifts/:shiftId` | Delete shift |

---

### Subscriptions — `/api/subscriptions`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/plans` | **[public]** List plans with features |
| GET | `/current` | Get current user subscription |
| POST | `/checkout` | Create Stripe checkout session URL |
| POST | `/cancel` | Cancel subscription at period end |
| GET | `/portal` | Get Stripe billing portal URL |

---

### Save the Date — `/api/save-the-date`

Requires Pro/Enterprise subscription.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/templates` | **[public]** List design templates |
| GET | `/` | List user's designs (paginated) |
| GET | `/:id` | Get design details |
| POST | `/` | Create design |
| PUT | `/:id` | Update design |
| DELETE | `/:id` | Delete design |
| POST | `/:id/generate` | Generate image via DALL-E 3 |

---

### Albums — `/api/albums`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/events/:eventId/albums` | Create album for event |
| GET | `/events/:eventId/albums` | Get event album with media |
| GET | `/:albumId` | Get album details |
| GET | `/:albumId/qrcode` | Download QR code PNG |
| GET | `/:albumId/download` | Download album as ZIP |
| DELETE | `/:albumId/media/:mediaId` | Delete media file |
| PUT | `/:albumId/media/:mediaId/favorite` | Toggle favourite |
| DELETE | `/:albumId` | Delete album |

---

### Guest Upload — `/api/upload` (Public)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:token` | **[public]** Get upload form info by token |
| POST | `/:token` | **[public]** Upload media (no auth required) |

---

### Wedding Planner — `/api/wedding-planner`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Get current user's wedding plan |
| POST | `/` | Create wedding plan |
| PUT | `/:id` | Update wedding plan |
| GET | `/:id/guests` | List wedding guests |
| POST | `/:id/guests` | Add guest |
| PUT | `/:id/guests/:guestId` | Update guest RSVP |
| DELETE | `/:id/guests/:guestId` | Remove guest |
| GET | `/:id/budget` | List budget items |
| POST | `/:id/budget` | Add budget item |
| PUT | `/:id/budget/:itemId` | Update budget item |
| DELETE | `/:id/budget/:itemId` | Remove budget item |

---

### Admin — `/api/admin` (Role: `tenant_admin` or `super_admin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Dashboard statistics (tenant-scoped) |
| GET | `/users` | List users in tenant |
| POST | `/users` | Create user in tenant |
| PUT | `/users/:userId` | Update user |
| DELETE | `/users/:userId` | Deactivate user |
| GET | `/audit-logs` | Query audit log |
| GET | `/invitations` | List pending invitations for tenant |
| POST | `/invitations` | Send a team invitation |
| DELETE | `/invitations/:id` | Revoke invitation |

---

### Tenant Management — `/api/tenants` (Role: `super_admin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats/platform` | Platform-wide statistics |
| GET | `/` | List all tenants (paginated, searchable) |
| POST | `/` | Create tenant |
| GET | `/:tenantId` | Get tenant details |
| PATCH | `/:tenantId` | Update tenant fields |
| DELETE | `/:tenantId/deactivate` | Deactivate tenant (soft delete) |
| GET | `/:tenantId/users` | List users for a tenant |
| POST | `/:tenantId/users` | Create tenant admin user |

---

### Super Admin — `/api/super-admin` (Role: `super_admin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Platform-wide statistics |
| GET | `/tenants` | List all tenants |
| POST | `/tenants` | Create tenant |
| GET | `/tenants/:tenantId` | Get tenant |
| PATCH | `/tenants/:tenantId` | Update tenant |
| DELETE | `/tenants/:tenantId/deactivate` | Deactivate tenant |
| GET | `/tenants/:tenantId/users` | List tenant users |
| POST | `/tenants/:tenantId/admins` | Create tenant admin |
| GET | `/users` | List all users (cross-tenant) |
| GET | `/users/:userId` | Get user |
| POST | `/users/:userId/deactivate` | Deactivate user |
| POST | `/users/:userId/activate` | Reactivate user |
| POST | `/users/:userId/impersonate` | Issue impersonation JWT |
| GET | `/subscriptions` | List all subscriptions |
| PATCH | `/subscriptions/:subscriptionId` | Override subscription plan/status |
| GET | `/audit-logs` | Query platform audit log |
| GET | `/features` | List all subscription feature rows |
| PATCH | `/features/:featureId` | Toggle feature flag or limit |

---

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/stripe/webhook` | **[public]** Stripe event webhook (signature verified) |

---

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | **[public]** Application health check |
| GET | `/health` | **[public]** Legacy health endpoint |

---

## 8. Authentication & Authorization

### JWT Authentication

All protected endpoints require:
```
Authorization: Bearer <token>
```

Token properties:
- **Algorithm:** HS256
- **Subject:** `userId`
- **Claims:** `role`, `email`, `tenantId`
- **Expiry:** 168 hours (7 days) — configurable via `JWT_EXPIRATION_HOURS`
- **Secret:** `JWT_SECRET_KEY` (min 32 characters, validated at startup)

### Impersonation Tokens

Super admins can issue short-lived impersonation tokens (`POST /api/super-admin/users/:userId/impersonate`):

- Expiry: 1 hour
- Extra claim: `impersonatedBy` (super admin email)
- Cannot impersonate another `super_admin` or inactive users
- Audit logged automatically

### Multi-Factor Authentication (MFA)

**TOTP (Time-based OTP) — via `otplib`:**
1. `GET /api/auth/totp-setup` → QR code URI
2. User scans with Google Authenticator / Authy
3. `POST /api/auth/verify-totp-setup` → confirms TOTP active
4. On login: `POST /api/auth/verify-mfa` with 6-digit code

**Email OTP (fallback):**
1. `POST /api/auth/send-email-otp` → email with 6-digit code
2. `POST /api/auth/verify-mfa` with code

### Google OAuth (via Supabase)

1. Frontend redirects to Supabase OAuth URL
2. After Google consent, Supabase redirects with `session_id` in URL hash
3. `AuthCallback.jsx` sends `session_id` to `POST /api/auth/google`
4. Backend exchanges `session_id` with Supabase, creates/updates user, returns JWT

### Role-Based Access Control (RBAC)

| Role | Access |
|------|--------|
| `super_admin` | All endpoints; `/api/super-admin/**`; `/api/tenants/**`; cross-tenant user management; impersonation |
| `tenant_admin` | All tenant-scoped endpoints; `/api/admin/**`; team invitations |
| `client` | Own events, vendors, marketplace, subscriptions |
| `staff` | Assigned events, own shifts, inventory |
| `vendor` | Own vendor profile, marketplace listing |

### Security Configuration

- **CSRF:** Disabled (stateless JWT)
- **Sessions:** Stateless — no server-side session state
- **CORS:** Validated against `CORS_ORIGINS` list; credentialed requests supported
- **Headers:** Helmet applied (relaxed for development; full CSP in production)
- **Password hashing:** BCrypt (10 rounds)

---

## 9. Multi-Tenant Architecture

UbukweHub is a **multi-tenant SaaS** platform where each subscribing business is an isolated tenant.

### Tenant Isolation

Every significant entity (`users`, `events`, `inventory_items`, `vendors`, `transactions`, `shifts`, `albums`, `event_tasks`, `vendor_profiles`, `save_the_date_designs`, `wedding_plans`, `subscriptions`) carries a `tenantId` foreign key. Queries in all service methods are automatically scoped to the authenticated user's `tenantId` derived from the JWT.

### Roles at a Glance

```
super_admin        — Platform owner; manages all tenants
  └── tenant_admin — Org admin; manages their team, billing, events
        ├── staff  — Handles assigned events, shifts, inventory
        ├── client — End customer; manages their own events
        └── vendor — Manages vendor profile
```

### Invitation Flow

1. A `tenant_admin` sends an invitation via `POST /api/admin/invitations`
2. `InvitationService` creates a `TenantInvitation` record (token, 48-hour expiry) and sends an email via Resend
3. Invitee opens `GET /api/auth/invitation/:token` to preview invite details
4. Invitee submits `POST /api/auth/accept-invitation` — account is created, JWT returned
5. Frontend: `/accept-invitation` page handles the token flow; `/onboarding` wizard guides new `tenant_admin` through setup

### Platform Constants

| Constant | Value |
|----------|-------|
| Platform root tenant ID | `00000000-0000-0000-0000-000000000001` |
| First real tenant ID | `00000000-0000-0000-0000-000000000002` |
| Super admin seed email | `admin@archives.com` |
| Invitation TTL | 48 hours |

---

## 10. Business Logic & Services

### AuthService

Registration, login, MFA setup/verification, Google OAuth session exchange, invitation acceptance, and password changes.

### EventService

- Creates events pre-populated with templates from the matching `EventType` (checklist, timeline, budget categories)
- Generates PDF reports (PDFKit) with event metadata and task summaries
- Provides event statistics scoped to the current tenant

### AiService

Integrates with Anthropic Claude (`claude-sonnet-4-6`) via the official Node.js SDK:

| Method | Capability |
|--------|-----------|
| `chat()` | General planning assistant |
| `generateChecklist()` | Smart task list for event type |
| `generateBudget()` | Budget allocation (Africa/RWF pricing awareness) |
| `generateTimeline()` | Event-day minute-by-minute schedule |
| `generateSeatingArrangement()` | Table seating suggestions |
| `suggestVendors()` | Vendor category recommendations |
| `calculateEventScore()` | 0–100 readiness score |

### SubscriptionService

- Checks feature availability via `isFeatureEnabled(userId, featureKey)` — queried from `SubscriptionFeature` table
- Activates subscription on successful Stripe payment
- Handles plan downgrade to free on cancellation or failed payment
- `createFreeSubscription()` called automatically when a new tenant admin is created

### StripeService

Manages Stripe Checkout sessions, billing portal, and webhook processing:

| Stripe Event | Action |
|-------------|--------|
| `checkout.session.completed` | Activate Pro/Enterprise subscription |
| `invoice.payment_failed` | Mark subscription `past_due` |
| `customer.subscription.deleted` | Downgrade to free plan |

### TenantService

CRUD for tenants, listing tenant users, and creating tenant admin accounts. The platform root tenant (`00000000-0000-0000-0000-000000000001`) cannot be deactivated.

### InvitationService

Creates tenant invitations, sends invitation emails, handles acceptance, and revokes invitations. Duplicate pending invitations for the same tenant + email pair are rejected (HTTP 409).

### ImpersonationService

Creates short-lived (1-hour) JWTs that allow a `super_admin` to act as any active non-super-admin user for debugging. All impersonations are audit logged.

### VendorMarketplaceService

Public vendor browsing, inquiry sending, review submission (with verified purchase check), and wishlist management.

### AlbumService

- Creates albums with a cryptographically secure public token for guest uploads
- Generates QR codes (PNG) pointing to the guest upload URL
- Supports bulk download as ZIP archive
- Handles thumbnail generation

### SaveTheDateService

- Manages design templates and user designs
- Calls OpenAI DALL-E 3 with user-provided style and text to generate card images

### EmailService

Sends transactional emails via **Resend API**: OTP codes, team invitations, event confirmations, and reminders.

### InventoryService

QR/barcode scan lookup, item availability tracking (available / rented / washing), and soft deletes.

### StaffService

Staff profiles (skills, certifications, availability) and shift scheduling. Staff can only see their own shifts.

### AuditService

Logs `CREATE`, `UPDATE`, `DELETE`, and `LOGIN` actions on all major resources. Super admins can query logs across all tenants; tenant admins are scoped to their tenant.

### AdminService

Tenant-scoped user listing and management. When called by `super_admin`, can target any tenant via `tenantId` query param.

---

## 11. Frontend Pages & Components

### Pages

| Page | Route | Access | Description |
|------|-------|--------|-------------|
| LoginPage | `/login` | Public | Login, register, MFA |
| AuthCallback | `/auth/callback` | Public | OAuth2 session → JWT handler |
| AcceptInvitationPage | `/accept-invitation` | Public | Token-based invitation accept |
| GuestUploadPage | `/upload/:token` | Public | Guest photo/video upload |
| MarketplacePage | `/marketplace` | Public | Browse vendor marketplace |
| OnboardingWizardPage | `/onboarding` | Authenticated | 4-step new-tenant setup |
| DashboardPage | `/dashboard` | Authenticated | Stats overview + recent activity |
| EventsPage | `/events` | Authenticated | Event list, create, manage |
| AIAssistantPage | `/ai` | Authenticated | Claude chatbot, generate plans |
| InventoryPage | `/inventory` | Authenticated | Equipment list, QR scanning |
| StaffPage | `/staff` | Authenticated | Staff directory + shift scheduling |
| VendorsPage | `/vendors` | Authenticated | Vendor directory |
| TransactionsPage | `/transactions` | Authenticated | Equipment rental/return logs |
| ReportsPage | `/reports` | Authenticated | Event analytics and reports |
| PricingPage | `/pricing` | Authenticated | Subscription plan comparison |
| SettingsPage | `/settings` | Authenticated | Profile, MFA, billing |
| PlannerPage | `/planner` | Authenticated | Wedding planner (6-tab layout) |
| AlbumGalleryPage | `/events/:eventId/album` | Authenticated | Event photo/video gallery |
| SaveTheDatePage | `/save-the-date` | Authenticated | AI card design generator |
| AdminPage | `/admin` | `tenant_admin`, `super_admin` | User and audit log management |
| SuperAdminDashboard | `/super-admin` | `super_admin` | Platform management shell |
| TenantsPage | `/super-admin/tenants` | `super_admin` | List and create tenants |
| TenantDetailsPage | `/super-admin/tenants/:tenantId` | `super_admin` | Edit tenant, manage users, invite, impersonate |
| AuditLogsPage | `/super-admin/audit-logs` | `super_admin` | Filterable platform audit logs |

### Wedding Planner Tabs (`/planner`)

| Tab Component | Description |
|---------------|-------------|
| `OverviewTab.jsx` | Summary, countdown, status |
| `GuestsTab.jsx` | Guest list, RSVP tracking |
| `BudgetTab.jsx` | Budget line items |
| `VenuesTab.jsx` | Venue options |
| `MenuTab.jsx` | Catering menu |
| `ThemeTab.jsx` | Visual theme / design assets |

### Key Components

- **ProtectedRoute** — Route guard; redirects unauthenticated users to `/login`; auto-redirects `super_admin` to `/super-admin`; redirects new `tenant_admin` to `/onboarding`
- **Layout** — App shell with navigation sidebar and header
- **OnboardingWizard** — 4-step wizard: branding → team invite → plan selection → launch
- **events/** — Event creation/editing forms, task management, detail modals
- **planner/** — Wedding planner tools: budget tracker, seating chart, guest list manager
- **subscription/SubscriptionGate** — Feature gate wrapper; shows upgrade prompt for gated features
- **ui/** — 30+ Radix UI primitives (Accordion, AlertDialog, Avatar, Badge, Calendar, Card, Carousel, Checkbox, Command, Dialog, Drawer, DropdownMenu, Form, Input, InputOtp, Label, Menubar, NavigationMenu, Pagination, Popover, Progress, RadioGroup, Resizable, ScrollArea, Select, Separator, Sheet, Skeleton, Slider, Switch, Table, Tabs, Textarea, Toast, Toggle, Tooltip, …)

### Contexts

| Context | Provides |
|---------|---------|
| `AuthContext` | `user`, `token`, `tenantId`, `login()`, `logout()`, `isSuperAdmin`, `isTenantAdmin`, `SUPER_ADMIN_ROLE`, `TENANT_ADMIN_ROLE` |
| `LanguageContext` | `language`, `setLanguage()`, `t()` translation function (English + Kinyarwanda) |
| `SubscriptionContext` | `subscription`, `isFeatureEnabled()`, `plan` |

### API Services (`api.js`)

Axios instance with:
- Base URL from `REACT_APP_BACKEND_URL`
- Request interceptor: injects `Authorization: Bearer <token>` from `AuthContext`
- Response interceptor: redirects to `/login` on 401

Named API client groups:
- `authAPI` — Auth + invitation endpoints
- `eventsAPI` — Events + tasks
- `inventoryAPI` — Inventory + scan
- `transactionAPI` — Transactions
- `staffAPI` — Staff + shifts
- `vendorsAPI` — Vendor directory
- `marketplaceAPI` — Public marketplace
- `adminAPI` — Tenant admin management
- `albumAPI` — Albums + media
- `aiAPI` — AI assistant endpoints
- `subscriptionAPI` — Plans + checkout
- `saveTheDateAPI` — Card designs
- `weddingPlannerAPI` — Wedding plan + sub-entities
- `superAdminAPI` — Platform-wide management

---

## 12. Subscription Plans & Feature Gating

### Plans

| Plan | Price | Duration |
|------|-------|----------|
| Free | $0 | Forever |
| Trial | $0 | 14 days |
| Pro | Configurable (monthly/yearly) | Recurring |
| Enterprise | Custom | Recurring |

### Feature Matrix

| Feature Key | Free | Trial | Pro | Enterprise |
|-------------|------|-------|-----|-----------|
| `unlimited_events` | No | Yes | Yes | Yes |
| `ai_assistant` | No | Yes | Yes | Yes |
| `save_the_date` | No | Yes | Yes | Yes |
| `vendor_marketplace` | No | Yes | Yes | Yes |
| `analytics` | No | Yes | Yes | Yes |

Feature availability is stored in `SubscriptionFeature` and evaluated at runtime via `SubscriptionService.isFeatureEnabled()`. The `featureGate` middleware blocks gated routes with HTTP 402. Super admins can toggle individual feature flags via `PATCH /api/super-admin/features/:featureId`.

---

## 13. Third-Party Integrations

### Anthropic Claude AI
- **SDK:** `@anthropic-ai/sdk`
- **Model:** `claude-sonnet-4-6`
- **Usage:** Event planning chatbot, checklist/budget/timeline/seating generation, vendor suggestions, readiness scoring
- **Access:** Feature-gated (Pro/Enterprise)

### OpenAI DALL-E 3
- **SDK:** `openai`
- **Usage:** AI-generated save-the-date card images
- **Trigger:** `POST /api/save-the-date/:id/generate`

### Stripe
- **SDK:** `stripe`
- **Usage:** Subscription checkout, billing portal, webhook events
- **Webhook:** `STRIPE_WEBHOOK_SECRET` must be set to verify `Stripe-Signature` header
- **Price IDs:** One per plan × billing period (4 total)

### Paystack
- **Usage:** Alternative payment processor for African markets
- **Status:** Config present; full initiation/webhook flow not yet implemented

### Resend
- **SDK:** `resend`
- **Usage:** Transactional emails — OTP codes, team invitations, confirmations
- **From:** configurable via `RESEND_FROM_EMAIL` / `RESEND_FROM_NAME`

### Supabase
- **PostgreSQL:** Production database (accessed via Prisma)
- **Storage:** File storage for uploaded media (`@supabase/supabase-js`)
- **OAuth:** Google login managed via Supabase Auth

### QR Code Generation
- **Package:** `qrcode`
- **Usage:** QR codes for inventory items and album share links

### PDF Generation
- **Package:** `pdfkit`
- **Endpoint:** `GET /api/events/:id/report` returns a PDF stream

---

## 14. Offline Support

The frontend registers a **service worker** (`public/service-worker.js`) via `services/offline.js` that:
- Caches critical static assets and API responses
- Falls back to cached data when the network is unavailable
- Uses **IndexedDB** (via the `idb` library) for structured local data persistence
- Syncs pending changes when connectivity is restored

---

## 15. Deployment Notes

### Backend (Node.js)

```bash
cd node-backend
npm install
cp .env.example .env   # fill in all required values
npx prisma generate
npx prisma migrate deploy
npm start              # production
npm run dev            # development (nodemon)
```

- Port: `8080` (configurable via `PORT`)
- Process manager: PM2 or systemd recommended for production
- Graceful shutdown: SIGTERM / SIGINT handled — in-flight requests drain (30 s timeout), then Prisma disconnects

### Frontend

```bash
cd frontend
yarn install
yarn build             # output: frontend/build/
```

Serve via any static host (Vercel, Netlify, S3 + CloudFront, etc.). Set `REACT_APP_BACKEND_URL` to the backend origin at build time.

### Stripe Webhook

- Expose `POST /api/stripe/webhook` publicly
- Register the URL in the Stripe Dashboard
- Set `STRIPE_WEBHOOK_SECRET` to the webhook signing secret

### Database

```bash
cd node-backend
npx prisma migrate deploy   # apply all pending migrations
```

Supabase connection pooling uses Transaction mode PgBouncer on port `6543` (`DATABASE_URL`). Use port `5432` (`DIRECT_URL`) for Prisma migrations.

---

*Updated: May 2026 — UbukweHub / Prani v2.0 (Node.js + Multi-Tenant)*
