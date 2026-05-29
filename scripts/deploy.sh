#!/usr/bin/env bash
set -euo pipefail

# Deploy without `wrangler login`: pull credentials from .dev.vars.
#   CLOUDFLARE_API_TOKEN  → authenticates `wrangler deploy`
#   CONVEX_DEPLOY_KEY     → deploys the Convex backend to prod
#
# `cut -d= -f2-` keeps everything after the first '=' so the base64 / '|' in the
# Convex key survives intact. Nothing is echoed, so secrets stay out of logs.

if [ ! -f .dev.vars ]; then
  echo "error: .dev.vars not found (needs CLOUDFLARE_API_TOKEN, CONVEX_DEPLOY_KEY)" >&2
  exit 1
fi

export CLOUDFLARE_API_TOKEN="$(grep -E '^CLOUDFLARE_API_TOKEN=' .dev.vars | cut -d= -f2-)"
export CONVEX_DEPLOY_KEY="$(grep -E '^CONVEX_DEPLOY_KEY=' .dev.vars | cut -d= -f2-)"

# Deploy Convex functions to prod, then build the frontend with VITE_CONVEX_URL
# pointed at that same prod deployment.
npx convex deploy --cmd-url-env-var-name VITE_CONVEX_URL --cmd 'vite build'

# Upload the Worker (auth via CLOUDFLARE_API_TOKEN).
npx wrangler deploy
