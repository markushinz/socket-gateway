#!/usr/bin/env bash

set -eo pipefail

git diff --exit-code

version=${1:-"$(./version.sh)"}

echo "${version}"

# docker buildx create --use
docker buildx build \
--push \
--platform linux/amd64,linux/arm64 \
--tag "markushinz/socket-gateway:$version" \
--tag "markushinz/socket-gateway:latest" .

git tag "v$version" -m "v$version"
git push origin "v$version"
