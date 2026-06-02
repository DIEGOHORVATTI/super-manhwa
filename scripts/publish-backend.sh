#!/usr/bin/env bash
# Build the delivery-service image locally and push it to GHCR — the manual
# alternative to the GitHub Actions build (.github/workflows/docker-publish.yml).
# Run from the repo root:  ./scripts/publish-backend.sh
set -euo pipefail

IMAGE="ghcr.io/diegohorvatti/super-manhwa"
SHA="$(git rev-parse --short HEAD)"

# Log in to GHCR with the gh CLI token (needs the 'write:packages' scope).
gh auth token | docker login ghcr.io -u "$(gh api user -q .login)" --password-stdin

# Build with the repo root as context so the Dockerfile can see packages/.
docker build -f apps/backend/Dockerfile -t "$IMAGE:latest" -t "$IMAGE:$SHA" .

docker push "$IMAGE:latest"
docker push "$IMAGE:$SHA"

echo "Pushed $IMAGE:latest and $IMAGE:$SHA"
