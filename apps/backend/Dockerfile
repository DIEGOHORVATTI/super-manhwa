# Delivery service image (ADR-0008). Persistent Bun server running the extension
# runtime. No build step — Bun runs the TS directly. Build context = repo root
# (so it can see packages/). Frontend is excluded via .dockerignore.
#   docker build -f apps/backend/Dockerfile -t manga-delivery .
FROM oven/bun:1.3-slim
WORKDIR /app

# Workspace manifests first for layer caching (must satisfy the workspaces globs).
COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/extension-runtime/package.json ./packages/extension-runtime/
RUN bun install --frozen-lockfile --production

# Source — only what the delivery service needs.
COPY packages ./packages
COPY apps/backend ./apps/backend

ENV PORT=8787 NODE_ENV=production
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s CMD bun -e "fetch('http://localhost:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["bun", "apps/backend/src/index.ts"]
