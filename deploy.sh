#!/usr/bin/env bash
# deploy.sh — Deploy Prani to Railway (backend) and Vercel (frontend)
# Usage: ./deploy.sh
# Prerequisites: railway CLI + vercel CLI logged in, SUPABASE envs in env files

set -e
BOLD="\033[1m"
TEAL="\033[36m"
RESET="\033[0m"
CHECKMARK="✓"

echo -e "${TEAL}${BOLD}=== Prani Deployment Script ===${RESET}"
echo ""

# ─── 1. Backend → Railway ─────────────────────────────────────────────────────
echo -e "${BOLD}[1/5] Deploying backend to Railway...${RESET}"
cd node-backend

if [ ! -f ".env" ]; then
  echo "  → No .env found. Copying .env.example → .env (fill in real values!)"
  cp .env.example .env
fi

# Initialise Railway project if not already linked
if ! railway status &>/dev/null; then
  echo "  → Linking Railway project..."
  railway init
fi

# Push environment variables from .env
echo "  → Setting Railway environment variables..."
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  railway variables set "$key=$value" --silent 2>/dev/null || true
done < .env

# Deploy
echo "  → Deploying..."
railway up --detach

# Get Railway URL
BACKEND_URL=$(railway domain 2>/dev/null | grep -o 'https://[^ ]*' | head -1)
if [ -z "$BACKEND_URL" ]; then
  echo "  → Could not auto-detect Railway URL. Generate one in the Railway dashboard."
  BACKEND_URL="https://prani-backend.up.railway.app"
fi
echo -e "  ${CHECKMARK} Backend deployed: ${TEAL}${BACKEND_URL}${RESET}"

# Run Prisma migrations on Railway
echo "  → Running database migrations..."
railway run npx prisma migrate deploy 2>/dev/null || echo "  ⚠ Migration failed — check DATABASE_URL env var"

cd ..

# ─── 2. Frontend → Vercel ─────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[2/5] Deploying frontend to Vercel...${RESET}"
cd frontend

# Build
echo "  → Building React app..."
REACT_APP_BACKEND_URL="$BACKEND_URL" \
REACT_APP_SUPABASE_URL="${REACT_APP_SUPABASE_URL:-https://yourproject.supabase.co}" \
REACT_APP_SUPABASE_ANON_KEY="${REACT_APP_SUPABASE_ANON_KEY:-placeholder}" \
yarn build

# Deploy
FRONTEND_URL=$(vercel --prod --yes \
  -e REACT_APP_BACKEND_URL="$BACKEND_URL" \
  -e REACT_APP_SUPABASE_URL="${REACT_APP_SUPABASE_URL:-https://yourproject.supabase.co}" \
  -e REACT_APP_SUPABASE_ANON_KEY="${REACT_APP_SUPABASE_ANON_KEY:-placeholder}" \
  2>&1 | grep -o 'https://[^ ]*vercel\.app' | tail -1)

echo -e "  ${CHECKMARK} Frontend deployed: ${TEAL}${FRONTEND_URL}${RESET}"
cd ..

# ─── 3. Update CORS on backend ────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[3/5] Updating CORS_ORIGINS on Railway...${RESET}"
cd node-backend
if [ -n "$FRONTEND_URL" ]; then
  railway variables set "CORS_ORIGINS=${FRONTEND_URL}" --silent 2>/dev/null || true
  railway variables set "FRONTEND_URL=${FRONTEND_URL}" --silent 2>/dev/null || true
  echo -e "  ${CHECKMARK} CORS updated to ${FRONTEND_URL}"
fi
cd ..

# ─── 4. Stripe webhook ────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[4/5] Stripe webhook reminder${RESET}"
echo "  Register this webhook URL in your Stripe Dashboard:"
echo -e "  ${TEAL}${BACKEND_URL}/api/stripe/webhook${RESET}"
echo "  Then set STRIPE_WEBHOOK_SECRET in Railway environment variables."

# ─── 5. Summary ───────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[5/5] Deployment summary${RESET}"
echo -e "  Backend:  ${TEAL}${BACKEND_URL}${RESET}"
echo -e "  Frontend: ${TEAL}${FRONTEND_URL}${RESET}"
echo ""
echo -e "${BOLD}API keys to add manually in Railway dashboard:${RESET}"
echo "  ANTHROPIC_API_KEY   — sk-ant-..."
echo "  OPENAI_API_KEY      — sk-..."
echo "  STRIPE_SECRET_KEY   — sk_live_..."
echo "  STRIPE_WEBHOOK_SECRET — whsec_..."
echo "  PAYSTACK_SECRET_KEY — sk_live_..."
echo "  RESEND_API_KEY      — re_..."
echo "  SUPABASE_SERVICE_KEY — eyJ..."
echo ""
echo -e "${TEAL}${BOLD}Prani deployment complete!${RESET}"
