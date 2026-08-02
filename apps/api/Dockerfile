# ══════════════════════════════════════════════════════════════════════
# PLANE 3 — the contract façade.
#
#   docker build -f apps/api/Dockerfile -t brs-api .
#                                                  ↑
#   Build context is the REPO ROOT, not this directory. The façade imports
#   @brs/contract and @brs/storage from the workspace, and a context rooted
#   at apps/api could not see them.
#
# Two stages: build bundles, runtime runs. The runtime image contains no
# TypeScript, no transpiler, no pnpm, no source map to the workspace, and
# no AWS SDK — see the note on externals below.
# ══════════════════════════════════════════════════════════════════════

# ── Stage 1: build ───────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /repo

RUN corepack enable

# Manifests and the lockfile first, so `pnpm install` is cached and only
# re-runs when dependencies actually change — not on every source edit.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json          apps/api/
COPY packages/contract/package.json packages/contract/
COPY packages/storage/package.json  packages/storage/
COPY packages/db/package.json       packages/db/
COPY apps/web/package.json          apps/web/
COPY tools/eslint-plugin-brs/package.json tools/eslint-plugin-brs/

# --frozen-lockfile: the build fails rather than silently resolving a
# different dependency tree than the one that was tested.
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY tsconfig.base.json ./
COPY packages/contract packages/contract
COPY packages/storage  packages/storage
COPY apps/api          apps/api

# Bundle to ONE file, dependencies included. The runtime stage then needs
# no node_modules whatsoever.
#
# Shipping source and running tsx was the alternative: it would put a
# TypeScript transpiler in production and pay its startup cost on every
# container restart.
#
# ── ONLY TWO EXTERNALS, AND BOTH ARE OPTIONAL ──
# `pg` reaches for pg-native and pg-cloudflare behind conditional requires
# it never takes in this deployment. Bundling them would fail (they are not
# installed); leaving them external means the require throws at call time,
# inside the try/catch pg already has. Verified: the bundled server serves
# /v1/health and /v1/collections against a real database.
#
# An earlier revision marked all of `pg` external and used `pnpm deploy`
# for the runtime tree. That dragged in @aws-sdk/client-s3 — a transitive
# dependency of @brs/storage — and produced a 268 MB image for a service
# that never makes an S3 call.
#
# @aws-sdk/client-s3 is deliberately NOT an external here: the façade
# imports @brs/storage/url, which has zero dependencies. If this bundle
# ever starts pulling in the SDK, the size jumps and says so.
RUN pnpm --filter @brs/api exec esbuild src/server.ts \
      --bundle \
      --platform=node \
      --target=node22 \
      --format=esm \
      --outfile=/repo/dist/server.mjs \
      --external:pg-native \
      --external:pg-cloudflare \
      --banner:js="import{createRequire}from'module';const require=createRequire(import.meta.url);" \
 && node -e "const s=require('fs').readFileSync('/repo/dist/server.mjs','utf8'); \
     if (/@aws-sdk|new S3Client/.test(s)) { console.error('AWS SDK leaked into the API bundle'); process.exit(1); } \
     console.log('bundle:', (s.length/1024).toFixed(0)+'KB, no AWS SDK');"

# ── Stage 2: runtime ─────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Alpine's node image already ships a `node` user (uid 1000). Using it
# rather than creating one keeps file ownership predictable across the
# COPY --chown below.
ENV NODE_ENV=production \
    PORT=8787

# One file. No node_modules, no package.json, no lockfile — nothing to
# audit at runtime and nothing to drift from what was tested.
COPY --from=build --chown=node:node /repo/dist/server.mjs ./server.mjs

USER node
EXPOSE 8787

# Hits the real route, not a TCP probe: the façade is only healthy if it
# can reach Postgres, and /v1/health answers 503 when it cannot. A port
# check would report a database-less container as healthy.
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# No shell wrapper: PID 1 is node itself, so SIGTERM reaches the signal
# handlers in server.ts and the pool drains instead of being killed after
# the orchestrator's grace period.
CMD ["node", "server.mjs"]
