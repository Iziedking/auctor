#!/usr/bin/env bash
set -Eeuo pipefail

revision="${1:?revision is required}"
image="${2:?image is required}"
deploy_dir="${AUCTOR_DEPLOY_DIR:-/opt/auctor}"

cd "$deploy_dir"
git fetch --prune origin main
git checkout --detach --force "$revision"
test -f .env

docker pull "$image"
AUCTOR_IMAGE="$image" docker compose --env-file .env -f docker-compose.prod.yml config >/dev/null
AUCTOR_IMAGE="$image" docker compose --env-file .env -f docker-compose.prod.yml run --rm migrate
AUCTOR_IMAGE="$image" docker compose --env-file .env -f docker-compose.prod.yml up -d --no-build --no-deps --wait app

curl --fail --silent --show-error https://api.auctor.space/api/health