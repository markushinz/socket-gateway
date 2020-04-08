#!/usr/bin/env bash

set -e

echo "[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no
[req_distinguished_name]
CN = localhost
[v3_req]
subjectAltName = @alt_names
[alt_names]
DNS.1 = localhost
DNS.2 = nginx-service" > server.conf

openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout server.key -out server.crt -config server.conf -extensions "v3_req"
rm -f server.conf
