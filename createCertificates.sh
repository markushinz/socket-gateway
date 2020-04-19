#!/usr/bin/env bash

set -e

cd config

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

openssl genrsa -out innerLayer.pem 4096
openssl rsa -in innerLayer.pem -pubout -out innerLayer.crt
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in innerLayer.pem -out innerLayer.key
rm -f innerLayer.pem

cd ..
