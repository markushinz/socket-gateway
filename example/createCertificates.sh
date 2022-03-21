#!/usr/bin/env bash

set -eo pipefail

cat << EOF > server.conf
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no
[req_distinguished_name]
CN = localhost
[v3_req]
subjectAltName = @alt_names
[alt_names]
DNS.1 = localhost
DNS.2 = gateway.localhost
DNS.3 = *.gateway.localhost
DNS.4 = nginx-service
EOF

openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout server.key -out server.crt -config server.conf -extensions "v3_req"
rm -f server.conf

cat << EOF > innerLayer.conf
[req]
distinguished_name = req_distinguished_name
prompt = no
[req_distinguished_name]
CN = inner-layer
EOF

openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout innerLayer.key -out innerLayer.crt -config innerLayer.conf
rm -f innerLayer.conf
