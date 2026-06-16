# Backend (apps/backend) — Bun + oRPC service, deployed on Railway.
# Builds from the repo root so the Bun workspaces (@packages/*) resolve.
FROM oven/bun:1

WORKDIR /app

# Whole monorepo (workspace members must all be present for the install).
COPY . .
RUN bun install --frozen-lockfile

ENV NODE_ENV=production
# Railway injects $PORT; the server reads env.PORT and binds 0.0.0.0.
EXPOSE 8787

# Run from the backend dir (no `cd &&` — Railway may exec the start command
# without a shell). Workspace deps still resolve via /app/node_modules.
WORKDIR /app/apps/backend
CMD ["bun", "src/index.ts"]
