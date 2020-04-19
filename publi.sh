#!/usr/bin/env bash
version=${1:-"2.1.0"}

set -e

git fetch
git tag "v$version" -m "v$version"

docker build -t "markushinz/socket-gateway-outer-layer:$version" \
  -t "markushinz/socket-gateway-outer-layer:latest" ./outer-layer
docker push "markushinz/socket-gateway-outer-layer:$version"
docker push "markushinz/socket-gateway-outer-layer:latest"

docker build -t "markushinz/socket-gateway-inner-layer:$version" \
  -t "markushinz/socket-gateway-inner-layer:latest" ./inner-layer
docker push "markushinz/socket-gateway-inner-layer:$version"
docker push "markushinz/socket-gateway-inner-layer:latest"

git push origin "v$version"
