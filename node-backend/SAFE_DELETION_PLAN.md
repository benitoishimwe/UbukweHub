# Safe Deletion Plan — Spring Boot Backend
**Project:** Prani Backend Migration  
**Date:** 2026-05-14  
**Status:** To be executed ONLY after Node.js backend is fully validated in production

---

## Prerequisites Before Any Deletion

Complete ALL of the following before deleting a single file:

- [ ] Node.js backend deployed to production and receiving traffic
- [ ] Node.js backend has been stable for at least **7 days** (no critical errors)
- [ ] All Stripe webhooks re-pointed to Node.js endpoint
- [ ] All environment variables migrated to Node.js deployment
- [ ] Database has not changed schema (Prisma `prisma db pull` matches)
- [ ] Frontend is confirmed working against Node.js backend
- [ ] CI/CD pipeline updated to build/deploy Node.js (not Spring Boot)
- [ ] Old Spring Boot server is receiving 0 traffic (all DNS/load-balancer updated)

---

## Phase 1: Disable Spring Boot (Week 1–2 After Go-Live)

**Do NOT delete yet. Disable and archive.**

### 1.1 Stop the Spring Boot Service

```bash
# If deployed on a VM/server:
systemctl stop prani-backend
systemctl disable prani-backend

# If running in Docker:
docker stop prani-backend-container
docker rm prani-backend-container
```

### 1.2 Revoke Spring Boot Environment Variables

In your secrets manager / hosting platform, mark the following as deprecated (do NOT delete yet — needed for rollback):
- `DATABASE_URL`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`
- `JWT_SECRET_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYSTACK_SECRET_KEY`
- `RESEND_API_KEY`

### 1.3 Redirect DNS / Reverse Proxy

Update Nginx / Caddy / cloud load-balancer to point to Node.js backend:
```nginx
# Before:
proxy_pass http://localhost:8080;  # Spring Boot

# After:
proxy_pass http://localhost:8080;  # Node.js (same port, different process)
# OR change the port if running on a different one
```

### 1.4 Update Stripe Webhooks

Log into [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks):
1. Update endpoint URL from `https://api.yourdomain.com/api/stripe/webhook` (Spring Boot) to the Node.js backend URL (likely the same domain if behind a proxy)
2. Confirm signature secret is copied to `STRIPE_WEBHOOK_SECRET` in Node.js env
3. Send a test webhook event — confirm 200 OK from Node.js

---

## Phase 2: Archive Spring Boot Source Code (Week 2–4)

**Archive before deleting.**

### 2.1 Create a Git Archive Tag

```bash
git tag archive/spring-boot-backend-v1.0 HEAD
git push origin archive/spring-boot-backend-v1.0
```

### 2.2 Create a ZIP Archive of prani-backend/

```bash
# From project root:
zip -r prani-backend-archive-2026-05-14.zip prani-backend/
```

Store this archive in a safe location (Google Drive, S3, or a long-term storage bucket) for at minimum **6 months**.

### 2.3 Archive the Build Artifacts

```bash
# Archive the .jar file if built:
cp prani-backend/target/prani-backend-1.0.0.jar ./archives/
```

---

## Phase 3: Files That Can Be Deleted (After 30-Day Validation)

### 3.1 Spring Boot Source Code — Safe to Delete

```
prani-backend/src/
prani-backend/target/
prani-backend/.mvn/
prani-backend/mvnw
prani-backend/mvnw.cmd
prani-backend/pom.xml
prani-backend/lombok.config
```

**Delete command:**
```bash
# After creating archive:
rm -rf prani-backend/src
rm -rf prani-backend/target
rm prani-backend/pom.xml
```

### 3.2 Files That Must NOT Be Deleted

| File/Directory | Reason |
|---|---|
| `prani-backend/src/main/resources/db/migration/*.sql` | Database history — archive separately, do not delete from Git history |
| `prani-backend/src/main/resources/application-local.yml` | Contains local DB credentials — verify these are not needed |
| Git history of `prani-backend/` | Forensic record — never delete from Git history |
| `prani-backend-archive-*.zip` | Rollback artifact |

---

## Phase 4: Configuration to Preserve

### 4.1 Environment Variables to Migrate (All Must Be in Node.js .env)

| Spring Boot Env Var | Node.js Equivalent | Notes |
|---|---|---|
| `DATABASE_URL` | `DATABASE_URL` | Same value (Supabase connection string) |
| `DATABASE_USERNAME` | Embedded in DATABASE_URL | Supabase uses connection string format |
| `DATABASE_PASSWORD` | Embedded in DATABASE_URL | Same |
| `JWT_SECRET_KEY` | `JWT_SECRET_KEY` | **Must be the same secret** — different secret = all users logged out |
| `ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` | Same key |
| `OPENAI_API_KEY` | `OPENAI_API_KEY` | Same key |
| `STRIPE_SECRET_KEY` | `STRIPE_SECRET_KEY` | Same key |
| `STRIPE_WEBHOOK_SECRET` | `STRIPE_WEBHOOK_SECRET` | **Get new one from Stripe if endpoint URL changes** |
| `STRIPE_PRICE_PRO_MONTHLY` | `STRIPE_PRICE_PRO_MONTHLY` | Same price IDs |
| `STRIPE_PRICE_PRO_YEARLY` | `STRIPE_PRICE_PRO_YEARLY` | Same |
| `STRIPE_PRICE_ENTERPRISE_MONTHLY` | `STRIPE_PRICE_ENTERPRISE_MONTHLY` | Same |
| `STRIPE_PRICE_ENTERPRISE_YEARLY` | `STRIPE_PRICE_ENTERPRISE_YEARLY` | Same |
| `PAYSTACK_SECRET_KEY` | `PAYSTACK_SECRET_KEY` | Same key |
| `RESEND_API_KEY` | `RESEND_API_KEY` | Same key |
| `RESEND_FROM_EMAIL` | `RESEND_FROM_EMAIL` | Same |
| `CORS_ORIGINS` | `CORS_ORIGINS` | Same frontend URL |
| `FRONTEND_URL` | `FRONTEND_URL` | Same |
| `PORT` | `PORT` | Same (8080) |
| **NEW** | `SUPABASE_URL` | Supabase project URL — needed for storage |
| **NEW** | `SUPABASE_SERVICE_KEY` | Service role key — needed for storage |
| **NEW** | `DIRECT_URL` | Direct DB URL (bypasses pgBouncer for Prisma migrations) |

> ⚠️ **Critical:** `JWT_SECRET_KEY` must be identical in both backends if you want existing user sessions to remain valid after cutover. If you use a different secret, all users will need to log in again.

### 4.2 Flyway History Table

The Spring Boot app used a custom Flyway history table named `prani_schema_history`. This table records which SQL migrations have run. **Do not drop this table** — it is harmless and serves as a historical record. The Node.js backend uses Prisma and does not interact with this table.

---

## Phase 5: CI/CD Changes

### 5.1 Update Build Pipeline

**Remove from CI/CD:**
```yaml
# Remove these steps:
- uses: actions/setup-java@v4
- run: mvn clean package -DskipTests
- run: docker build -f Dockerfile.java .
```

**Add to CI/CD:**
```yaml
# Add these steps:
- uses: actions/setup-node@v4
  with:
    node-version: '20'
- run: cd node-backend && npm ci
- run: cd node-backend && npx prisma generate
- run: cd node-backend && npm start
```

### 5.2 Update Dockerfile (if containerized)

**Old Dockerfile.java:**
```dockerfile
FROM eclipse-temurin:21-jdk
COPY target/prani-backend-1.0.0.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**New Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY node-backend/package*.json ./
RUN npm ci --only=production
COPY node-backend/ .
RUN npx prisma generate
EXPOSE 8080
CMD ["node", "src/index.js"]
```

### 5.3 Update Health Check

Old health check may have pointed to `/api/health` with a Spring-specific probe. The Node.js backend exposes the same endpoint — no change needed.

---

## Phase 6: Deployment Changes

### 6.1 Memory Allocation

| Resource | Spring Boot | Node.js |
|---|---|---|
| Minimum RAM | 256MB | 64MB |
| Recommended RAM | 512MB–1GB | 256MB |
| CPU | 1 core min | 0.5 core min |
| Startup time | 5–15 seconds | 0.5–2 seconds |

You can **reduce your server/container size** after migration, saving cost.

### 6.2 Process Manager (for VM deployments)

```bash
# Install PM2:
npm install -g pm2

# Start Node.js backend:
pm2 start node-backend/src/index.js --name prani-backend --instances 2

# Auto-restart on server reboot:
pm2 startup
pm2 save
```

### 6.3 Remove Java Runtime

After 30-day validation:
```bash
# Remove Java (if only used for Spring Boot):
apt remove openjdk-21-jdk
apt autoremove
```

---

## Phase 7: Rollback Strategy

If the Node.js backend has a critical issue after cutover:

### 7.1 Immediate Rollback (< 30 minutes)

1. Restart the archived Spring Boot jar:
   ```bash
   java -jar ./archives/prani-backend-1.0.0.jar \
     --spring.profiles.active=prod \
     --server.port=8080
   ```
2. Update Nginx/load-balancer to point back to Spring Boot port
3. Switch Stripe webhooks back to Spring Boot endpoint
4. No database changes needed (both use same Supabase DB)

### 7.2 Why Rollback is Safe

- Both backends share the **same PostgreSQL database** — no data loss
- Both backends use the **same JWT secret** — user sessions remain valid
- Both backends are **stateless** — no in-memory state to worry about
- The only state differences are:
  - Audit logs (may have entries from Node.js during validation)
  - Any new records created during the Node.js validation period

### 7.3 Rollback Decision Tree

```
Node.js issue reported
    │
    ├─ Is it a configuration issue? → Fix env var, restart Node.js
    │
    ├─ Is it a single endpoint bug? → Hot-fix and redeploy Node.js
    │
    ├─ Is it a data corruption risk? → IMMEDIATE ROLLBACK to Spring Boot
    │
    └─ Is it a performance issue? → Profile, fix, redeploy; rollback only if SLA breach
```

---

## Final Deletion Checklist

Execute this checklist in order, at least 30 days after successful go-live:

- [ ] Git archive tag created: `archive/spring-boot-backend-v1.0`
- [ ] ZIP archive stored in S3/Drive/backup
- [ ] All team members notified of deletion
- [ ] Spring Boot service stopped for 30+ days with no rollback needed
- [ ] `.java` source files deleted from working tree
- [ ] `pom.xml`, `mvnw`, `.mvn/` deleted
- [ ] `target/` directory deleted (was excluded from Git anyway)
- [ ] Java runtime removed from servers
- [ ] CI/CD pipeline updated and tested
- [ ] All Stripe webhooks confirmed pointing to Node.js
- [ ] All environment variables confirmed in Node.js deployment
- [ ] Documentation updated to reflect Node.js backend
- [ ] `prani-backend/` directory removed from repository
- [ ] Final commit: `chore: remove archived Spring Boot backend (migrated to Node.js)`

---

## Risk Matrix

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| JWT secret mismatch → users logged out | Low (if copied correctly) | High | Verify JWT_SECRET_KEY is identical before cutover |
| Missing env var in Node.js | Medium | High | Use go-live checklist; test all features before cutover |
| Stripe webhook secret wrong | Medium | High | Re-test webhook immediately after cutover |
| Paystack flows broken | Low | Medium | Paystack not fully implemented; test before cutover if used |
| Data corruption | Very Low | Critical | Both backends use same DB; no schema changes needed |
| Performance regression | Low | Medium | Profile under load; Node.js handles I/O better |
