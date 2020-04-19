#!/usr/bin/env bash
version=${1:-"2.1.0"}

set -e

git fetch
git tag "v$version" -m "v$version"

docker build -t "docker.pkg.github.com/markushinz/socket-gateway/outer-layer:$version" \
  -t "docker.pkg.github.com/markushinz/socket-gateway/outer-layer:latest" ./outer-layer
docker push "docker.pkg.github.com/markushinz/socket-gateway/outer-layer:$version"
docker push "docker.pkg.github.com/markushinz/socket-gateway/outer-layer:latest"

docker build -t "docker.pkg.github.com/markushinz/socket-gateway/inner-layer:$version" \
  -t "docker.pkg.github.com/markushinz/socket-gateway/inner-layer:latest" ./inner-layer
docker push "docker.pkg.github.com/markushinz/socket-gateway/inner-layer:$version"
docker push "docker.pkg.github.com/markushinz/socket-gateway/inner-layer:latest"

git push origin "v$version"
