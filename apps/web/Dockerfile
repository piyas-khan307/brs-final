# ══════════════════════════════════════════════════════════════════════
# PLANE 4 — the delivery frontend.
#
#   docker build -f apps/web/Dockerfile -t brs-web . \
#     --build-arg NEXT_PUBLIC_BRS_API=https://api.example.org \
#     --build-arg NEXT_PUBLIC_STORAGE_BASE_URL=https://assets.example.org
#
# Build context is the REPO ROOT — the app imports @brs/contract.
#
# ── THIS IMAGE IS ENVIRONMENT-SPECIFIC, ON PURPOSE ──
# NEXT_PUBLIC_* values are INLINED into the JavaScript at build time; that
# is what `NEXT_PUBLIC_` means. So this is not a build-once-deploy-anywhere
# image, and pretending otherwise would be the lie.
#
# The usual fix is a sentinel string swapped by an entrypoint script at
# container start. It is rejected here because it buys nothing: the site is
# a STATIC EXPORT, so the content itself is already baked in — every
# publish is a rebuild anyway (§B5 webhook). Adding a substitution layer
# would create an illusion of portability that the baked content already
# breaks, at the cost of a startup script mangling files it does not
# understand.
#
# What that means operationally: staging and production are separate
# builds. A rebuild takes about two minutes.
#
# ── CONTENT IS NOT FETCHED HERE ──
# `pnpm --filter @brs/web content` regenerates src/lib/*.generated.ts from
# the live API, and it runs BEFORE this build, in the deploy pipeline. It
# is not a build step because it would make `docker build` require network
# access to a running façade — turning an offline, reproducible build into
# one that fails when the API is down.
#
# The committed generated files are the input. `content:check` in CI fails
# if they are stale, so "reproducible" does not quietly become "outdated".
# ══════════════════════════════════════════════════════════════════════

# ── Stage 1: build ───────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /repo

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json          apps/web/
COPY apps/api/package.json          apps/api/
COPY packages/contract/package.json packages/contract/
COPY packages/storage/package.json  packages/storage/
COPY packages/db/package.json       packages/db/
COPY tools/eslint-plugin-brs/package.json tools/eslint-plugin-brs/

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY tsconfig.base.json eslint.config.mjs ./
COPY packages/contract packages/contract
COPY packages/storage  packages/storage
COPY tools            tools
COPY apps/web         apps/web

# Inlined into the bundle. Declared as ARGs so they are visible in
# `docker history` — these are public URLs, not secrets. Nothing secret
# may ever be passed this way: a build arg is recoverable from the image.
ARG NEXT_PUBLIC_BRS_API=http://localhost:8787
ARG NEXT_PUBLIC_STORAGE_BASE_URL=http://localhost:9000/brs-assets
ENV NEXT_PUBLIC_BRS_API=${NEXT_PUBLIC_BRS_API} \
    NEXT_PUBLIC_STORAGE_BASE_URL=${NEXT_PUBLIC_STORAGE_BASE_URL} \
    NEXT_TELEMETRY_DISABLED=1

# next.config.ts sets typescript.ignoreBuildErrors=false and
# eslint.ignoreDuringBuilds=false, so this fails on a type or lint error
# rather than shipping one.
RUN pnpm --filter @brs/web build

# Fail loudly if the export is empty or the URLs did not make it in. A
# silently blank `out/` produces a container that serves 404s and looks
# perfectly healthy, which is the worst way to find out.
RUN test -f apps/web/out/index.html \
 && grep -q "$(printf %s "${NEXT_PUBLIC_STORAGE_BASE_URL}" | sed 's/[].[^$*\/]/\\&/g')" apps/web/out/index.html \
 && echo "export ok: $(find apps/web/out -type f | wc -l) files"

# ── Stage 2: runtime ─────────────────────────────────────────────────
#
# nginx-unprivileged, not plain nginx. The stock image starts its master
# process as root; this one runs entirely as uid 101 with no capability to
# escalate. For a container whose only job is reading static files off
# disk, root is pure downside.
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

COPY --chown=nginx:nginx apps/web/nginx.conf                  /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx apps/web/nginx-security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build --chown=nginx:nginx /repo/apps/web/out /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=3s --retries=3 \
  CMD ["/bin/sh", "-c", "wget -qO- http://127.0.0.1:8080/healthz || exit 1"]
