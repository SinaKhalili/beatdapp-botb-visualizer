#!/usr/bin/env bash
set -euo pipefail

# Deploy the Convex backend (prod) + build the frontend against the prod Convex
# URL, then upload the Cloudflare Worker.
#
# Credentials needed:
#   CLOUDFLARE_API_TOKEN  → authenticates `wrangler deploy`
#   CONVEX_DEPLOY_KEY     → deploys the Convex backend to prod
#
# Local runs read these from .dev.vars (gitignored). CI (GitHub Actions) sets
# them from repo secrets, so we only load the file when it exists.
# `cut -d= -f2-` keeps everything after the first '=' so the base64/'|' survive.
# Nothing is echoed, so secrets stay out of logs.

if [ -f .dev.vars ]; then
  export CLOUDFLARE_API_TOKEN="$(grep -E '^CLOUDFLARE_API_TOKEN=' .dev.vars | cut -d= -f2-)"
  export CONVEX_DEPLOY_KEY="$(grep -E '^CONVEX_DEPLOY_KEY=' .dev.vars | cut -d= -f2-)"
fi

: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN (in .dev.vars or the environment)}"
: "${CONVEX_DEPLOY_KEY:?set CONVEX_DEPLOY_KEY (in .dev.vars or the environment)}"

# Deploy Convex functions to prod, then build the frontend with VITE_CONVEX_URL
# pointed at that same prod deployment.
npx convex deploy --cmd-url-env-var-name VITE_CONVEX_URL --cmd 'vite build'

# Upload the Worker (auth via CLOUDFLARE_API_TOKEN).
npx wrangler deploy
