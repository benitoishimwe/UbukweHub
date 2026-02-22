# UbukweHub PRD — Rwanda Wedding Planning & Operations Platform

## Problem Statement
Build "UbukweHub" — a production-ready wedding planning and operations platform for Rwanda. Inspired by Ivanda Weddings. Platform serves Admin, Staff, and Client roles with full inventory management, event planning, AI assistance, and offline capabilities.

## Architecture
- **Frontend**: React 19, React Router v7, Tailwind CSS, Framer Motion, Recharts, @dnd-kit, IDB
- **Backend**: FastAPI, Motor (async MongoDB), PyJWT, PyOTP, Emergentintegrations (OpenAI GPT-4o)
- **Database**: MongoDB (collections: users, user_sessions, inventory, transactions, events, shifts, vendors, audit_logs, email_otps, ai_cache)
- **Auth**: JWT (custom) + Google OAuth (Emergent-managed) + TOTP/Email OTP MFA
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **Offline**: Service Worker + IndexedDB (idb library)

## User Personas
1. **Admin** (benishimwe31@gmail.com) — Full platform control, MFA enforced
2. **Staff** (jeanpaul@ubukwe.rw) — Field operations, inventory, shifts
3. **Client** (client@example.rw) — View events, limited access

## Core Requirements (Static)
- Multi-role RBAC (Admin/Staff/Client)
- MFA for Admin: TOTP + Email OTP
- English + Kinyarwanda i18n
- Mobile-first responsive design
- Inventory CRUD with QR/barcode support
- Transactions: rent/return/wash/buy/lost/damage
- Event management with greatness score
- Staff shift management
- Vendor portal
- AI Planning Assistant (GPT-4o)
- Wedding Greatness Score Agent (0-100)
- Admin Console with immutable audit logs
- Offline mode (Service Worker + IndexedDB)

## What's Been Implemented (MVP v1 — Feb 2025)

### Backend
- ✅ FastAPI server with all 8 route modules
- ✅ JWT authentication (login, register, refresh)
- ✅ Google OAuth (Emergent-managed)
- ✅ TOTP MFA setup and verification
- ✅ Email OTP (returns code in response for demo)
- ✅ RBAC dependencies (admin/staff/client)
- ✅ Immutable audit logs on all mutations
- ✅ Inventory CRUD + QR scan + stats
- ✅ Transaction management + inventory count updates
- ✅ Event management + greatness score integration
- ✅ Staff management + shift CRUD
- ✅ Vendor CRUD
- ✅ Admin console (user CRUD, audit logs, sessions)
- ✅ AI endpoints: Greatness, Checklist, Budget, Vendor Discovery, Chat
- ✅ MongoDB seed script with admin, 5 staff, 12 inventory, 3 events, 5 vendors

### Frontend
- ✅ Login page with JWT + Google OAuth + MFA flow
- ✅ Kinyarwanda + English i18n (LanguageContext + JSON files)
- ✅ Protected routes with role-based access
- ✅ Responsive Layout with desktop sidebar + mobile bottom nav
- ✅ Dashboard (stats cards, quick actions, recent transactions)
- ✅ Events page (list/create/filter by status)
- ✅ Inventory page (grid, stats, add item, QR search)
- ✅ Transactions page (list, create with type pills)
- ✅ Staff page (list, shifts planner)
- ✅ Vendors page (list, add vendor)
- ✅ AI Assistant page (Greatness score gauge, checklist, budget, chat)
- ✅ Reports page (bar/pie charts, export JSON)
- ✅ Admin Console (user CRUD, audit logs)
- ✅ Settings page (language toggle, TOTP MFA setup, accessibility modes)
- ✅ Auth Callback (Google OAuth)
- ✅ Service Worker (offline caching + sync queue)
- ✅ IndexedDB (offline transaction queue)

### Design
- ✅ Soft gold (#C9A84C), blush pink (#E8A4B8), ivory (#F5F0E8), charcoal (#2D2D2D)
- ✅ Playfair Display (headings) + Manrope (body)
- ✅ Mobile-first, accessible
- ✅ Micro-animations, skeleton loaders
- ✅ High-contrast + large-text accessibility modes

## Test Results (Feb 2025)
- Backend: 20/20 tests pass (100%)
- Frontend: 95% — Reports page stats for staff users fixed post-test
- Admin MFA: TOTP + Email OTP flows verified

## Prioritized Backlog

### P0 — Critical Next Steps
- [ ] Email OTP: Integrate actual email provider (SendGrid/Resend) instead of mock
- [ ] QR code generation: Generate actual QR code images for inventory items (qrcode lib installed)
- [ ] Real-time chat: WebSocket-based event chat with pinned messages
- [ ] Drag-and-drop shift planner: Implement @dnd-kit for visual shift planning

### P1 — High Priority
- [ ] Staff onboarding wizard: Multi-step form for role/skills/certifications/availability
- [ ] Bulk import: CSV/Excel upload for inventory/staff
- [ ] Vendor AI discovery: Full vendor intelligence with scoring
- [ ] Report export: PDF export of reports
- [ ] Event detail page with vendor/staff assignment UI
- [ ] Push notifications: Service Worker push for alerts
- [ ] Offline transaction sync: Complete sync flow with conflict resolution UI

### P2 — Nice to Have
- [ ] Voice prompts for Kinyarwanda accessibility
- [ ] Photo upload for inventory items (S3 integration)
- [ ] Scheduled report exports
- [ ] SSO/SAML integration
- [ ] What-if simulator for Greatness score
- [ ] Client portal (dedicated view for event clients)
- [ ] Mobile PWA install prompt

## Seed Credentials
- Admin: benishimwe31@gmail.com / Admin@2025! (TOTP Secret: Z2JPZ3UXAACQZ2KLP2SWYRO6ACF4UVJ2)
- Staff: jeanpaul@ubukwe.rw / Staff@2025!
- Client: client@example.rw / Client@2025!

## Deployment
- Backend: FastAPI on port 8001 (supervisor-managed)
- Frontend: React on port 3000 (supervisor-managed)
- MongoDB: localhost:27017
- Preview URL: https://ubukwe-weddings.preview.emergentagent.com
