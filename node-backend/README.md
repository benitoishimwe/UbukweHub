# Prani Node.js Backend
**Stack:** Node.js 20 · Express.js · Prisma ORM · PostgreSQL (Supabase)  
**Migrated from:** Spring Boot 3.2.5

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# → Fill in all values in .env

# 3. Generate Prisma client
npx prisma generate

# 4. Verify database schema matches
npx prisma db pull   # pulls existing schema from Supabase
npx prisma validate  # confirms our schema matches

# 5. Start development server
npm run dev
```

Server runs at `http://localhost:8080`

Health check: `GET http://localhost:8080/api/health`

---

## Project Structure

```
node-backend/
├── prisma/
│   └── schema.prisma          # All 30 database models
├── src/
│   ├── app.js                 # Express setup, middleware, route mounting
│   ├── index.js               # Server entry point (graceful shutdown)
│   ├── config/
│   │   ├── env.js             # Environment variable validation
│   │   ├── prisma.js          # Prisma client singleton
│   │   └── supabase.js        # Supabase storage client
│   ├── middleware/
│   │   ├── auth.js            # JWT + session token authentication
│   │   ├── rbac.js            # Role-based access control
│   │   ├── featureGate.js     # Subscription feature gating (402)
│   │   └── errorHandler.js    # Global error handler + AppError class
│   ├── utils/
│   │   ├── jwt.js             # JWT create/validate utilities
│   │   ├── totp.js            # TOTP + email OTP utilities (otplib)
│   │   ├── qrcode.js          # QR code PNG generation
│   │   ├── pdf.js             # Event report PDF generation (PDFKit)
│   │   └── response.js        # HTTP response helpers
│   ├── services/              # Business logic layer
│   │   ├── auth.service.js
│   │   ├── subscription.service.js
│   │   ├── tenant.service.js
│   │   ├── event.service.js
│   │   ├── inventory.service.js
│   │   ├── transaction.service.js
│   │   ├── vendor.service.js
│   │   ├── vendorMarketplace.service.js
│   │   ├── album.service.js
│   │   ├── weddingPlanner.service.js
│   │   ├── saveTheDate.service.js
│   │   ├── staff.service.js
│   │   ├── ai.service.js      # Claude + DALL-E integrations
│   │   ├── stripe.service.js
│   │   ├── email.service.js   # Resend SDK
│   │   ├── audit.service.js   # Async audit logging
│   │   ├── invitation.service.js
│   │   ├── impersonation.service.js
│   │   └── admin.service.js
│   └── routes/                # Express routers
│       ├── index.js           # Route registry
│       ├── auth.routes.js     # /api/auth
│       ├── subscription.routes.js  # /api/subscriptions
│       ├── tenant.routes.js   # /api/tenants
│       ├── event.routes.js    # /api/events
│       ├── inventory.routes.js # /api/inventory
│       ├── transaction.routes.js # /api/transactions
│       ├── vendor.routes.js   # /api/vendors
│       ├── marketplace.routes.js # /api/marketplace
│       ├── album.routes.js    # /api/albums
│       ├── weddingPlanner.routes.js # /api/wedding-planner
│       ├── saveTheDate.routes.js # /api/save-the-date
│       ├── staff.routes.js    # /api/staff
│       ├── ai.routes.js       # /api/ai
│       ├── stripe.routes.js   # /api/stripe
│       ├── upload.routes.js   # /api/upload
│       ├── admin.routes.js    # /api/admin
│       ├── superAdmin.routes.js # /api/super-admin
│       └── health.routes.js   # /api/health
├── .env.example               # Environment variable template
├── GO_LIVE_CHECKLIST.md       # Pre-deployment checklist
├── MIGRATION_VERIFICATION_REPORT.md  # Coverage audit
└── SAFE_DELETION_PLAN.md      # Plan for removing Spring Boot backend
```

---

## API Routes Summary

| Base Path | Description | Auth |
|---|---|---|
| `GET /api/health` | Health check | Public |
| `POST /api/auth/*` | Registration, login, MFA | Mostly public |
| `GET /api/auth/me` | Current user | Required |
| `GET /api/subscriptions/plans` | Plan listing | Public |
| `GET/POST /api/subscriptions/*` | Subscription management | Required |
| `GET /api/marketplace/*` | Vendor browsing | Public |
| `POST /api/marketplace/*` | Reviews, inquiries, favorites | Required |
| `GET/POST /api/albums/public/:token` | Public album access | Public |
| `POST /api/upload/album/:token` | Guest photo upload | Public (token) |
| `GET/POST /api/events/*` | Event management | Required |
| `GET/POST /api/inventory/*` | Inventory management | Required |
| `GET/POST /api/transactions/*` | Transaction tracking | Required |
| `GET/POST /api/vendors/*` | Vendor management | Required |
| `GET/POST /api/albums/*` | Album management | Required |
| `GET/POST /api/wedding-planner/*` | Wedding planning | Required |
| `GET/POST /api/save-the-date/*` | Save-the-date designs | Required |
| `GET/POST /api/staff/*` | Staff management | Required |
| `POST /api/ai/*` | AI assistant (feature-gated) | Required + Plan |
| `POST /api/stripe/*` | Stripe payments | Mixed |
| `GET/POST /api/admin/*` | Admin operations | tenant_admin+ |
| `GET/POST /api/tenants/*` | Tenant management | super_admin |
| `GET/POST /api/super-admin/*` | Platform management | super_admin |

---

## Authentication

All protected routes require:
```
Authorization: Bearer <jwt_token>
```

Or for Google OAuth session:
```
X-Session-Token: <session_token>
```

**JWT Payload:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "tenant_admin",
  "tenantId": "uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Roles:** `super_admin` > `tenant_admin` > `staff` / `client` / `vendor`

---

## Multi-Tenancy

All data is scoped to `tenantId`. Service methods automatically filter:
```javascript
// All queries include:
where: { tenantId: req.user.tenantId }
```

`super_admin` users can see all tenants' data by passing `tenantId` as a query param.

---

## Subscription Feature Gates

Features gated by plan:

| Feature Key | Free | Trial | Pro | Enterprise |
|---|---|---|---|---|
| `ai_assistant` | ❌ | ✅ | ✅ | ✅ |
| `save_the_date` | ❌ | ✅ | ✅ | ✅ |
| `vendor_marketplace` | ❌ | ❌ | ✅ | ✅ |
| `analytics` | ❌ | ❌ | ✅ | ✅ |
| `unlimited_events` | ❌ | ❌ | ✅ | ✅ |
| `advanced_reports` | ❌ | ❌ | ❌ | ✅ |

Gated routes return `402 Payment Required`:
```json
{
  "error": "Feature not available",
  "feature_key": "ai_assistant",
  "message": "Upgrade your plan to access AI features"
}
```

---

## Environment Variables

See `.env.example` for the full list. Critical variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase pooler URL (port 6543) |
| `DIRECT_URL` | Supabase direct URL (port 5432) — for Prisma migrations |
| `JWT_SECRET_KEY` | **Must match Spring Boot secret during transition** |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` | For file storage |

---

## Production Deployment

```bash
# Using PM2 (recommended):
npm install -g pm2
pm2 start src/index.js --name prani-backend --instances 2
pm2 save
pm2 startup
```

**Docker:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 8080
CMD ["node", "src/index.js"]
```

---

## Scripts

```bash
npm run dev       # Start with nodemon (hot reload)
npm start         # Production start
npm run db:generate  # Generate Prisma client
npm run db:studio    # Open Prisma Studio (DB browser)
npm run db:migrate   # Run pending Prisma migrations
```

---

## Migration Notes

This backend is a full migration from Spring Boot 3.2.5. See:
- `MIGRATION_VERIFICATION_REPORT.md` — 99% coverage audit
- `SAFE_DELETION_PLAN.md` — when/how to remove Spring Boot
- `GO_LIVE_CHECKLIST.md` — pre-launch verification checklist
