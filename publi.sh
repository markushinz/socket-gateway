#!/usr/bin/env bash

set -e

git fetch
tag=$(git describe --abbrev=0)

major=0
minor=0
patch=0
if [[ ${tag:1} =~ ([0-9]+).([0-9]+).([0-9]+) ]]; then
  major="${BASH_REMATCH[1]}"
  minor="${BASH_REMATCH[2]}"
  patch="${BASH_REMATCH[3]}"
fi
patch=$(echo "${patch} + 1" | bc)
version=${1:-"${major}.${minor}.${patch}"}

echo "${version}"

docker build -t "markushinz/socket-gateway:$version" \
  -t "markushinz/socket-gateway:latest" .

git tag "v$version" -m "v$version"

docker push "markushinz/socket-gateway:$version"
docker push "markushinz/socket-gateway:latest"

git push origin "v$version"
