# UbukweHub (Prani) — Full Application Documentation

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
9. [Business Logic & Services](#9-business-logic--services)
10. [Frontend Pages & Components](#10-frontend-pages--components)
11. [Subscription Plans & Feature Gating](#11-subscription-plans--feature-gating)
12. [Third-Party Integrations](#12-third-party-integrations)
13. [Offline Support](#13-offline-support)
14. [Deployment Notes](#14-deployment-notes)

---

## 1. Project Overview

**UbukweHub** (product name: **Prani**) is a full-stack SaaS application designed to help African event planners — primarily in Rwanda — manage every aspect of event planning. The platform provides:

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

---

## 2. Tech Stack

### Backend

| Layer | Technology |
|-------|-----------|
| Framework | Spring Boot 3.2.5 (Java 21) |
| Security | Spring Security + JWT (JJWT 0.12.5) |
| Database | PostgreSQL via Supabase (Flyway migrations) |
| ORM | JPA / Hibernate + hypersistence-utils (JSONB support) |
| Connection Pool | HikariCP |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
| Image Generation | OpenAI DALL-E 3 |
| Email | Resend API |
| Payments | Stripe + Paystack |
| PDF Export | iText 8 |
| QR Codes | Google Zxing 3.5.3 |
| Data Mapping | MapStruct 1.5.5 |
| HTTP Client | Spring WebClient (reactive) |
| Utils | Lombok, Jackson, OpenCSV |
| Build | Maven + Spring Boot Maven Plugin |

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
├── prani-backend/                        # Spring Boot backend
│   ├── src/main/java/com/prani/
│   │   ├── PraniApplication.java         # Entry point
│   │   ├── config/
│   │   │   ├── SecurityConfig.java       # Spring Security + CORS
│   │   │   └── WebConfig.java
│   │   ├── controller/                   # 14 REST controllers
│   │   ├── entity/                       # 24+ JPA entities
│   │   ├── service/                      # Business logic (16 services)
│   │   ├── repository/                   # Spring Data JPA repositories
│   │   ├── security/
│   │   │   ├── JwtAuthenticationFilter.java
│   │   │   ├── JwtService.java
│   │   │   └── PraniAuthPrincipal.java
│   │   └── exception/                    # Exception handlers
│   ├── src/main/resources/
│   │   ├── application.yml               # Main configuration
│   │   └── db/migration/                 # Flyway SQL files (V1–V16)
│   └── pom.xml
│
├── frontend/                             # React application
│   ├── src/
│   │   ├── App.js                        # Root router
│   │   ├── pages/                        # 17 page components
│   │   ├── components/
│   │   │   ├── events/                   # Event forms & modals
│   │   │   ├── planner/                  # Wedding planner tools
│   │   │   ├── onboarding/               # Setup wizards
│   │   │   ├── subscription/             # Plan selection & checkout
│   │   │   └── ui/                       # Radix UI wrappers
│   │   ├── contexts/                     # Auth, Language, Subscription
│   │   ├── services/
│   │   │   ├── api.js                    # Axios instance + API clients
│   │   │   └── offline.js                # Service worker + IndexedDB
│   │   ├── hooks/
│   │   ├── lib/                          # Utilities
│   │   └── i18n/                         # Translations
│   ├── package.json
│   └── public/
│
├── .env.example                          # Environment variable template
├── design_guidelines.json
├── auth_testing.md
├── DOCUMENTATION.md                      # This file
└── test_reports/
```

---

## 4. Environment Variables

### Backend (`application.yml` / `.env`)

```env
# Database (Supabase PostgreSQL)
SUPABASE_HOST=db.<project-id>.supabase.co
SUPABASE_PASSWORD=<password>

# Authentication
JWT_SECRET=<min-32-char-secret>
JWT_EXPIRATION_HOURS=168

# Anthropic Claude AI
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-6

# OpenAI (DALL-E image generation)
OPENAI_API_KEY=sk-...

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@prani.app

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_YEARLY=price_...
STRIPE_PRICE_ID_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ID_ENTERPRISE_YEARLY=price_...

# Paystack (Africa/Rwanda Payments)
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_WEBHOOK_SECRET=...

# Application
APP_URL=https://app.prani.app
BACKEND_PORT=8080
CORS_ORIGINS=*
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
PostgreSQL managed by **Supabase** (hosted on `aws-1-eu-west-3.pooler.supabase.com`).

### Migrations
Flyway manages schema versioning with 16 migration files (`V1__...` through `V16__...`):

| Version | Description |
|---------|------------|
| V1 | Event table extensions |
| V2 | Event type templates |
| V3 | Event tasks |
| V4 | Subscriptions |
| V5 | Subscription features |
| V6 | Payments |
| V7 | Vendor marketplace |
| V8 | Save-the-date designs |
| V9 | Event type seeding |
| V10 | Subscription feature seeding |
| V11 | Email OTP codes |
| V12–V14 | JSONB column conversions |
| V15 | Album tables |
| V16 | Wedding planner tables |

### Connection Pool (HikariCP)

| Setting | Value |
|---------|-------|
| Max pool size | 20 (prod) / 10 (default) |
| Min idle | 2 |
| Connection timeout | 30s |
| Idle timeout | 10min |
| Max lifetime | 30min |

### JSONB Columns
Several columns store complex nested data as JSONB for flexibility:

- `events.checklist` — task hierarchy
- `events.timeline` — event-day schedule
- `events.seating_plan` — table-to-guest mappings
- `events.guest_list` — RSVP status + meal choices
- `events.budget_breakdown` — category allocations

---

## 6. Data Models (Entities)

### User
Represents all system users (clients, staff, vendors, admins).

| Field | Type | Description |
|-------|------|-------------|
| userId | UUID | Primary key |
| email | String | Unique login email |
| name | String | Display name |
| role | Enum | `admin`, `staff`, `client`, `vendor` |
| passwordHash | String | BCrypt hash |
| googleId | String | Google OAuth ID |
| mfaEnabled | Boolean | MFA active flag |
| mfaSecret | String | TOTP secret |
| skills | String[] | Staff skill tags |
| certifications | String[] | Staff certifications |
| availability | String | Staff availability string |
| isActive | Boolean | Soft delete flag |
| createdAt / updatedAt | Timestamp | Audit timestamps |

---

### Event
Core entity for planned events.

| Field | Type | Description |
|-------|------|-------------|
| eventId | UUID | Primary key |
| name | String | Event name |
| eventDate | LocalDate | Scheduled date |
| venue | String | Location |
| clientId | UUID | Owning user |
| clientName | String | Denormalized client name |
| staffIds | UUID[] | Assigned staff |
| vendorIds | UUID[] | Assigned vendors |
| status | Enum | `upcoming`, `completed`, `cancelled` |
| budget | BigDecimal | Total budget |
| guestCount | Integer | Expected guest count |
| greatnessScore | Integer | AI readiness score (0–100) |
| eventTypeSlug | String | Links to EventType template |
| checklist | JSONB | Task list |
| timeline | JSONB | Event-day schedule |
| seatingPlan | JSONB | Seating arrangement |
| guestList | JSONB | Guest RSVP data |
| budgetBreakdown | JSONB | Budget categories |

---

### EventType
Template for each event category.

| Field | Type | Description |
|-------|------|-------------|
| typeId | UUID | Primary key |
| slug | String | `wedding`, `corporate`, `birthday`, `conference`, `private_party` |
| checklistTemplate | JSONB | Default checklist |
| timelineTemplate | JSONB | Default timeline |
| budgetCategories | JSONB | Default budget categories |

---

### EventTask
Individual planning task for an event.

| Field | Type | Description |
|-------|------|-------------|
| taskId | UUID | Primary key |
| eventId | UUID | Parent event |
| title | String | Task name |
| description | String | Details |
| category | String | Task category |
| dueDate | LocalDate | Deadline |
| assignedTo | UUID | Assigned staff user |
| status | Enum | `todo`, `in_progress`, `done` |
| priority | Enum | `high`, `medium`, `low` |
| createdBy | UUID | Creator user |

---

### Subscription
User subscription record.

| Field | Type | Description |
|-------|------|-------------|
| subscriptionId | UUID | Primary key |
| userId | UUID | Subscribed user |
| plan | Enum | `free`, `trial`, `pro`, `enterprise` |
| status | Enum | `active`, `past_due`, `cancelled` |
| stripeCustomerId | String | Stripe customer ID |
| stripeSubscriptionId | String | Stripe subscription ID |
| paystackSubscriptionCode | String | Paystack subscription code |
| currentPeriodStart | Timestamp | Billing period start |
| currentPeriodEnd | Timestamp | Billing period end |
| trialEndsAt | Timestamp | Trial expiry |
| cancelAtPeriodEnd | Boolean | Scheduled cancellation |

---

### SubscriptionFeature
Feature availability matrix per plan.

| Field | Type | Description |
|-------|------|-------------|
| featureId | UUID | Primary key |
| plan | Enum | Plan this row applies to |
| featureKey | String | `ai_assistant`, `save_the_date`, `vendor_marketplace`, `analytics`, `unlimited_events` |
| isEnabled | Boolean | Feature enabled for plan |
| limitValue | Integer | Numeric limit (e.g., max events) |

---

### Vendor
Core vendor record.

| Field | Type | Description |
|-------|------|-------------|
| vendorId | UUID | Primary key |
| name | String | Business name |
| category | String | Service category |
| contactName | String | Contact person |
| email | String | Contact email |
| phone | String | Phone number |
| location | String | Location/city |
| rating | Double | Average rating (1–5) |
| isVerified | Boolean | Marketplace verification |
| isActive | Boolean | Soft delete flag |

---

### VendorProfile
Extended marketplace details for a vendor.

| Field | Type | Description |
|-------|------|-------------|
| profileId | UUID | Primary key |
| vendorId | UUID | Parent vendor |
| bio | String | Description |
| website | String | Website URL |
| instagram / facebook | String | Social handles |
| serviceAreas | String[] | Coverage areas |
| priceMin / priceMax | BigDecimal | Price range |
| currency | String | Currency code |
| packages | JSONB | Service packages |
| availability | JSONB | Available dates |
| tags | String[] | Search tags |
| isMarketplaceActive | Boolean | Public listing flag |

---

### VendorReview
User review of a vendor.

| Field | Type | Description |
|-------|------|-------------|
| reviewId | UUID | Primary key |
| vendorId | UUID | Reviewed vendor |
| userId | UUID | Reviewer |
| eventId | UUID | Associated event |
| rating | Integer | 1–5 stars |
| title | String | Review headline |
| body | String | Review body |
| isVerified | Boolean | Verified purchase review |

---

### InventoryItem
Physical equipment item.

| Field | Type | Description |
|-------|------|-------------|
| itemId | UUID | Primary key |
| name | String | Item name |
| category | String | Equipment category |
| qrCode | String | QR code value |
| barcode | String | Barcode value |
| quantity | Integer | Total quantity |
| available | Integer | Available count |
| rented | Integer | Currently rented |
| washing | Integer | Being cleaned |
| condition | Enum | `good`, `fair`, `damaged` |
| purchasePrice | BigDecimal | Cost price |
| rentalPrice | BigDecimal | Rental price |
| photos | String[] | Photo URLs |
| isActive | Boolean | Soft delete flag |

---

### Transaction
Inventory movement log.

| Field | Type | Description |
|-------|------|-------------|
| transactionId | UUID | Primary key |
| type | Enum | `rent`, `return`, `wash`, `buy`, `lost`, `damage` |
| itemId | UUID | Related item |
| itemName | String | Denormalized item name |
| eventId | UUID | Associated event |
| eventName | String | Denormalized event name |
| staffId | UUID | Staff member |
| staffName | String | Denormalized staff name |
| quantity | Integer | Quantity moved |
| photo | String | Photo evidence URL |
| returnDate | LocalDate | Expected return |

---

### Shift
Staff shift schedule.

| Field | Type | Description |
|-------|------|-------------|
| shiftId | UUID | Primary key |
| eventId | UUID | Associated event |
| staffId | UUID | Assigned staff |
| staffName | String | Denormalized name |
| role | String | Role for this shift |
| date | LocalDate | Shift date |
| startTime | LocalTime | Start time |
| endTime | LocalTime | End time |
| status | Enum | `scheduled`, `confirmed`, `completed` |
| tasks | String[] | Shift task list |

---

### Album
Guest photo/video album per event.

| Field | Type | Description |
|-------|------|-------------|
| albumId | UUID | Primary key |
| eventId | UUID | Parent event |
| token | String | Secure public upload token |
| title | String | Album title |
| description | String | Description |
| isActive | Boolean | Active flag |
| maxFileSizeMb | Integer | Upload limit |
| allowVideos | Boolean | Video upload flag |
| createdBy | UUID | Creator user |

---

### AlbumMedia
Media file within an album.

| Field | Type | Description |
|-------|------|-------------|
| mediaId | UUID | Primary key |
| albumId | UUID | Parent album |
| fileName | String | Stored filename |
| originalName | String | Original upload name |
| fileType | String | MIME type |
| mediaType | Enum | `image`, `video` |
| fileSize | Long | File size in bytes |
| fileUrl | String | Storage URL |
| thumbnailUrl | String | Thumbnail URL |
| uploaderName | String | Guest uploader name |
| isFavorite | Boolean | Favorite flag |
| uploadedAt | Timestamp | Upload timestamp |

---

### SaveTheDateDesign
Save-the-date card design.

| Field | Type | Description |
|-------|------|-------------|
| designId | UUID | Primary key |
| userId | UUID | Owning user |
| eventId | UUID | Associated event |
| title | String | Design title |
| templateId | String | Base template |
| textContent | JSONB | Text fields |
| style | JSONB | Visual styles |
| uploadedPhoto | String | User uploaded photo URL |
| generatedImageUrl | String | DALL-E output URL |
| aiPromptUsed | String | The prompt sent to DALL-E |
| status | Enum | `draft`, `published` |

---

### WeddingPlan / WeddingGuest / BudgetItem / WeddingVenue / WeddingMenuItem / WeddingDesignAsset
Wedding-specific sub-entities linked to a WeddingPlan, supporting: guest RSVP tracking, budget line items, venue options, catering menu items, and design assets (colors, fonts).

---

### AuditLog
Immutable audit trail.

| Field | Type | Description |
|-------|------|-------------|
| logId | UUID | Primary key |
| userId | UUID | Acting user |
| action | String | `CREATE`, `UPDATE`, `DELETE` |
| resource | String | Entity type |
| resourceId | String | Entity ID |
| timestamp | Timestamp | Action time |
| details | String | JSON detail blob |

---

### EmailOtp
One-time email verification code.

| Field | Type | Description |
|-------|------|-------------|
| otpId | UUID | Primary key |
| userId | UUID | Target user |
| email | String | Recipient email |
| code | String | 6-digit code |
| expiresAt | Timestamp | Expiry |

---

## 7. API Reference

**Base URL:** `http://localhost:8080` (development) / `https://api.prani.app` (production)

All endpoints require `Authorization: Bearer <jwt_token>` unless marked **[public]**.

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

---

### Events — `/api/events`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List events (paginated; filters: status, type, search) |
| GET | `/stats` | Event counts by status |
| GET | `/types` | List event type templates |
| GET | `/{id}` | Get single event |
| GET | `/{id}/report` | Download PDF event report |
| POST | `/` | Create event |
| PUT | `/{id}` | Update event |
| DELETE | `/{id}` | Delete event |
| GET | `/{id}/tasks` | List event tasks |
| POST | `/{id}/tasks` | Create task |
| PUT | `/{id}/tasks/{taskId}` | Update task |
| DELETE | `/{id}/tasks/{taskId}` | Delete task |
| PUT | `/{id}/guests` | Replace guest list (JSONB) |
| PUT | `/{id}/seating` | Replace seating plan (JSONB) |
| PUT | `/{id}/budget` | Replace budget breakdown (JSONB) |

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
| GET | `/{id}` | Get vendor details |
| POST | `/` | Create vendor |
| PUT | `/{id}` | Update vendor |
| DELETE | `/{id}` | Soft delete vendor |

---

### Vendor Marketplace — `/api/marketplace`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/vendors` | **[public]** Browse marketplace |
| GET | `/categories` | **[public]** List categories |
| GET | `/vendors/{id}` | **[public]** Vendor detail + profile |
| GET | `/vendors/{id}/reviews` | **[public]** Paginated reviews |
| POST | `/vendors/{id}/inquire` | Send vendor inquiry |
| POST | `/vendors/{id}/review` | Leave vendor review |
| GET | `/favorites` | Get user's favorite vendors |
| POST | `/favorites/{vendorId}` | Add to favorites |
| DELETE | `/favorites/{vendorId}` | Remove from favorites |

---

### Inventory — `/api/inventory`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List inventory (filters: category, condition, search) |
| GET | `/categories` | Get available categories |
| GET | `/stats` | Inventory statistics |
| GET | `/scan/{code}` | Look up item by QR code or barcode |
| GET | `/{id}` | Get item details |
| POST | `/` | Create inventory item |
| PUT | `/{id}` | Update inventory item |
| DELETE | `/{id}` | Soft delete item |

---

### Transactions — `/api/transactions`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List transactions (filters: type, item, event, staff) |
| GET | `/stats` | Transaction statistics |
| GET | `/{id}` | Get transaction |
| POST | `/` | Create transaction |
| PUT | `/{id}` | Update transaction |

---

### Staff — `/api/staff`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List staff (paginated, searchable) |
| GET | `/stats` | Staff statistics |
| GET | `/me/shifts` | Current user's upcoming shifts |
| GET | `/{userId}` | Get staff member profile |
| PUT | `/{userId}` | Update staff profile |
| GET | `/shifts/all` | All shifts (filters: event, date) |
| POST | `/shifts` | Create shift |
| PUT | `/shifts/{shiftId}` | Update shift |
| DELETE | `/shifts/{shiftId}` | Delete shift |

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
| GET | `/{id}` | Get design details |
| POST | `/` | Create design |
| PUT | `/{id}` | Update design |
| DELETE | `/{id}` | Delete design |
| POST | `/{id}/generate` | Generate image via DALL-E 3 |

---

### Albums — `/api/albums` & `/api/events/{eventId}/albums`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/events/{eventId}/albums` | Create album for event |
| GET | `/api/events/{eventId}/albums` | Get event album with media |
| GET | `/api/albums/{albumId}` | Get album details |
| GET | `/api/albums/{albumId}/qrcode` | Download QR code PNG |
| GET | `/api/albums/{albumId}/download` | Download album as ZIP |
| DELETE | `/api/albums/{albumId}/media/{mediaId}` | Delete media file |
| PUT | `/api/albums/{albumId}/media/{mediaId}/favorite` | Toggle favorite |
| DELETE | `/api/albums/{albumId}` | Delete album |

---

### Guest Upload — `/api/upload` (Public)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/{token}` | **[public]** Get upload form info by token |
| POST | `/{token}` | **[public]** Upload media (no auth required) |

---

### Admin — `/api/admin` (Role: ADMIN only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Dashboard statistics |
| GET | `/users` | List all users (paginated, filterable by role) |
| POST | `/users` | Create user |
| PUT | `/users/{userId}` | Update any user |
| DELETE | `/users/{userId}` | Deactivate user |
| GET | `/audit-logs` | Query audit log (filters: user, action, resource, date) |
| GET | `/sessions` | List active user sessions |
| GET | `/subscriptions` | List all subscriptions |

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
- **Claims:** `role`, `email`
- **Expiry:** 168 hours (7 days) — configurable via `JWT_EXPIRATION_HOURS`
- **Secret:** `JWT_SECRET` environment variable (min 32 chars recommended)

The `JwtAuthenticationFilter` intercepts every request, extracts and validates the Bearer token, and injects a `PraniAuthPrincipal` into the Spring Security context.

### Multi-Factor Authentication (MFA)

**TOTP (Time-based OTP):**
1. User calls `GET /api/auth/totp-setup` → receives QR code URI
2. User scans QR code with an authenticator app (Google Authenticator, Authy, etc.)
3. User confirms setup via `POST /api/auth/verify-totp-setup`
4. On next login, after email/password, user is redirected to `POST /api/auth/verify-mfa` with the 6-digit TOTP code

**Email OTP (fallback):**
1. User calls `POST /api/auth/send-email-otp` → receives email with a 6-digit code
2. User submits code to `POST /api/auth/verify-mfa`

### Google OAuth (via Supabase)

1. Frontend redirects user to Supabase OAuth URL
2. After Google consent, Supabase redirects to frontend with `session_id`
3. `AuthCallback.jsx` sends `session_id` to `POST /api/auth/google`
4. Backend exchanges `session_id` with Supabase for user info, creates/updates user, returns JWT

### Role-Based Access Control (RBAC)

| Role | Access |
|------|--------|
| `admin` | All endpoints including `/api/admin/**` |
| `client` | Own events, vendors, marketplace, subscriptions |
| `staff` | Assigned events, own shifts, inventory |
| `vendor` | Own vendor profile, marketplace listing |

Admin endpoints are secured with `@PreAuthorize("hasRole('ADMIN')")`.

### Password Security
- BCrypt hashing (strength 10)
- Stored in `User.passwordHash`
- Change password requires current password verification

### Security Configuration
- **CSRF:** Disabled (stateless JWT)
- **Sessions:** `STATELESS` — no server-side session state
- **CORS:** Configurable via `CORS_ORIGINS` (default: `*`)

---

## 9. Business Logic & Services

### AuthService
Handles registration, login, MFA setup/verification, Google OAuth session exchange, and password changes. On login, the client's IP address is logged.

### EventService
- Creates events pre-populated with templates from the matching `EventType` (checklist, timeline, budget categories)
- Generates PDF reports (iText 8) with event metadata and task summaries
- Provides event statistics (counts by status)
- Cascades task deletion on event delete

### AiAssistantService
Integrates with Anthropic Claude (`claude-sonnet-4-6`) via reactive WebClient:

| Method | Claude Capability |
|--------|-----------------|
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

### StripeService
Manages Stripe Checkout sessions, billing portal, and webhook processing:

| Stripe Event | Action |
|-------------|--------|
| `checkout.session.completed` | Activate Pro/Enterprise subscription |
| `invoice.payment_failed` | Mark subscription `past_due` |
| `customer.subscription.deleted` | Downgrade to free plan |

### VendorMarketplaceService
Public vendor browsing, inquiry sending, review submission (with verified purchase check), and wishlist management.

### AlbumService
- Creates albums with a cryptographically secure public token for guest uploads (no auth required)
- Generates QR codes (PNG) pointing to the guest upload URL
- Supports bulk download as ZIP archive
- Handles thumbnail generation

### SaveTheDateService
- Manages design templates and user designs
- Calls OpenAI DALL-E 3 with user-provided style and text to generate card images

### EmailService
Sends transactional emails via **Resend API**: OTP codes, event invitations, confirmations, and reminders.

### InventoryService
- QR/barcode scan lookup (`GET /inventory/scan/{code}`)
- Tracks item availability counts (available / rented / washing)
- Soft deletes items

### StaffService
Manages staff profiles (skills, certifications, availability) and shift scheduling. Staff can only see their own shifts via `GET /staff/me/shifts`.

### AuditService
Automatically logs `CREATE`, `UPDATE`, `DELETE` actions on all major resources to the `AuditLog` table for admin review.

---

## 10. Frontend Pages & Components

### Pages

| Page | Route | Description |
|------|-------|-------------|
| LoginPage | `/login` | Login, register, MFA |
| AuthCallback | `/auth/callback` | OAuth2 session → JWT handler |
| DashboardPage | `/dashboard` | Stats overview + recent activity |
| EventsPage | `/events` | Event list, create, manage |
| AIAssistantPage | `/ai` | Claude chatbot, generate plans |
| InventoryPage | `/inventory` | Equipment list, QR scanning |
| StaffPage | `/staff` | Staff directory + shift scheduling |
| VendorsPage | `/vendors` | Vendor directory |
| MarketplacePage | `/marketplace` | Browse vendors, send inquiries, reviews |
| TransactionsPage | `/transactions` | Equipment rental/return logs |
| AdminPage | `/admin` | Admin: users, audit logs, subscriptions |
| PricingPage | `/pricing` | Subscription plan comparison |
| SettingsPage | `/settings` | Profile, MFA, billing |
| ReportsPage | `/reports` | Event analytics and reports |
| SaveTheDatePage | `/save-the-date` | AI card design generator |
| AlbumGalleryPage | `/album/:albumId` | Event photo/video gallery |
| GuestUploadPage | `/upload/:token` | Public guest photo upload |

### Key Components

- **ProtectedRoute** — Route guard: redirects unauthenticated users to `/login`, optionally checks role
- **Layout** — App shell with navigation sidebar and header
- **events/** — Event creation/editing forms, task management, detail modals
- **planner/** — Wedding planner tools: budget tracker, seating chart, guest list manager
- **subscription/** — Plan comparison cards, Stripe checkout redirect
- **ui/** — Reusable Radix UI primitives: Button, Card, Dialog, Dropdown, Form, Input, Select, Table, Tabs, Badge, etc.

### Contexts

| Context | Provides |
|---------|---------|
| `AuthContext` | `user`, `token`, `login()`, `logout()` |
| `LanguageContext` | `language`, `setLanguage()`, `t()` translation function |
| `SubscriptionContext` | `subscription`, `isFeatureEnabled()`, `plan` |

### API Services (`api.js`)

Axios instance with:
- Base URL from `REACT_APP_BACKEND_URL`
- Request interceptor: injects `Authorization: Bearer <token>` from `AuthContext`
- Response interceptor: redirects to `/login` on 401

Named API clients:
- `authAPI` — Auth endpoints
- `eventsAPI` — Events + tasks
- `inventoryAPI` — Inventory + transactions
- `staffAPI` — Staff + shifts
- `vendorsAPI` — Vendors + marketplace
- `adminAPI` — Admin endpoints
- `albumAPI` — Albums + media
- `aiAPI` — AI assistant endpoints

---

## 11. Subscription Plans & Feature Gating

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
| `unlimited_events` | No (limited) | Yes | Yes | Yes |
| `ai_assistant` | No | Yes | Yes | Yes |
| `save_the_date` | No | Yes | Yes | Yes |
| `vendor_marketplace` | No | Yes | Yes | Yes |
| `analytics` | No | Yes | Yes | Yes |

Feature availability is stored in the `SubscriptionFeature` table and evaluated at runtime via `SubscriptionService.isFeatureEnabled()`. Attempting to access a gated feature throws `@FeatureGatedException`, which returns HTTP 402.

---

## 12. Third-Party Integrations

### Anthropic Claude AI
- **Model:** `claude-sonnet-4-6`
- **API Version:** `2023-06-01`
- **Usage:** Event planning chatbot, checklist/budget/timeline/seating generation, vendor suggestions, readiness scoring
- **Access:** Feature-gated (Pro/Enterprise)

### OpenAI DALL-E 3
- **Usage:** AI-generated save-the-date card images
- **Trigger:** `POST /api/save-the-date/{id}/generate`
- **Flow:** User provides style + text → prompt sent to DALL-E 3 → image URL stored in `generatedImageUrl`

### Stripe
- **Usage:** Subscription checkout, billing portal, webhook events
- **Webhook Secret:** Must be configured to verify `Stripe-Signature` header
- **Price IDs:** One per plan × billing period (4 total)

### Paystack
- **Usage:** Alternative payment processor for African markets (Rwanda, etc.)
- **Status:** Configured but not fully implemented in the current core flow

### Resend
- **Usage:** Transactional emails — OTP codes, invitations, confirmations
- **From:** `noreply@prani.app`

### Supabase
- **PostgreSQL:** Production database
- **OAuth:** Google login managed via Supabase Auth

### Google Zxing
- **Usage:** Generate QR code PNGs for inventory items and album share links
- **Endpoint:** `GET /api/albums/{albumId}/qrcode` returns PNG bytes

### iText 8
- **Usage:** PDF report generation
- **Endpoint:** `GET /api/events/{id}/report` returns PDF stream

---

## 13. Offline Support

The frontend registers a **service worker** (via `offline.js`) that:
- Caches critical static assets and API responses
- Falls back to cached data when the network is unavailable
- Uses **IndexedDB** (via the `idb` library) for structured local data persistence
- Syncs pending changes when connectivity is restored

---

## 14. Deployment Notes

### Backend
- Build: `mvn clean package -DskipTests`
- Run: `java -jar target/prani-backend-*.jar`
- Port: `8080` (configurable via `BACKEND_PORT`)
- Flyway migrations run automatically on startup

### Frontend
- Build: `yarn build`
- Output: `frontend/build/`
- Serve via any static host (Vercel, Netlify, S3 + CloudFront, etc.)
- Set `REACT_APP_BACKEND_URL` to the backend origin at build time

### Stripe Webhook
- Expose `POST /api/stripe/webhook` publicly
- Register the URL in the Stripe Dashboard
- Set `STRIPE_WEBHOOK_SECRET` to the webhook signing secret from Stripe

### Database
- Run `flyway migrate` or let Spring Boot auto-apply on startup
- Supabase connection pooling is handled via Transaction mode PgBouncer on port `6543`

---

*Generated: April 2026 — UbukweHub / Prani v1.0*
