#!/usr/bin/env bash

set -e

export NODE_ENV=development
# export DEBUG="engine,socket.io*"
export SG_INNER_LAYER_PUBLIC_KEY_FILE=./config/innerLayer.crt
export SG_TARGETS_FILE=./config/targets.yaml;
export SG_OUTER_LAYER=http://localhost:3001
export SG_INNER_LAYER_PRIVATE_KEY_FILE=./config/innerLayer.key

node -e "require('./dist/outer-layer/server'); require('./dist/inner-layer/server');"
