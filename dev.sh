#!/usr/bin/env bash

set -e

SG_TARGETS="$(cat << EOF
targets:
  "localhost":
    hostname: "jsonplaceholder.typicode.com"
EOF
)"

./createCertificates.sh

export NODE_ENV=development
# export DEBUG="engine,socket.io*"
export SG_INNER_LAYER_PUBLIC_KEY_FILE=./config/innerLayer.crt
export SG_INNER_LAYER_PRIVATE_KEY_FILE=./config/innerLayer.key
export SG_TARGETS
export SG_OUTER_LAYER=http://localhost:3001

node -e "require('./dist/outer-layer/server'); require('./dist/inner-layer/server');"
