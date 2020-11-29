#!/usr/bin/env bash

set -e

SG_TARGETS="$(cat << EOF
targets:
  "localhost":
    hostname: "jsonplaceholder.typicode.com"
EOF
)"
export SG_TARGETS

export NODE_ENV=development
# export DEBUG="engine,socket.io*"

node << EOF
const pki = require('node-forge').pki;

const keys = pki.rsa.generateKeyPair({ bits: 4096 });
process.env.SG_INNER_LAYER_PUBLIC_KEY = pki.publicKeyToPem(keys.publicKey);
process.env.SG_INNER_LAYER_PRIVATE_KEY = pki.privateKeyToPem(keys.privateKey);

require('./dist/outer-layer/server');
require('./dist/inner-layer/server');
EOF
