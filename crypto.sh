#!/bin/bash
outerLayer=${1:-localhost}

openssl req -x509 -newkey rsa:4096 -nodes -keyout ca.key -out ca.crt -days 365 -subj "/CN=Socket Gateway Root CA"
openssl req -newkey rsa:2048 -nodes -keyout client.key -out client.csr -subj "/CN=Socket Gateway Inner Layer"
openssl x509 -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt -sha256
openssl req -newkey rsa:2048 -nodes -keyout socket_server.key -out socket_server.csr -subj "/CN=$outerLayer"
openssl x509 -req -days 365 -in socket_server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out socket_server.crt -sha256

echo -e "[req]\ndistinguished_name = req_distinguished_name\nx509_extensions = v3_req\nprompt = no\n[req_distinguished_name]\nCN = $outerLayer\n[v3_req]\nsubjectAltName = @alt_names\n[alt_names]\nDNS.1 = $outerLayer" > app_server.conf
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout app_server.key -out app_server.crt -config app_server.conf -extensions "v3_req"

cp ca.crt socket_ca.crt

mv client.crt ./inner-layer/tls/client.crt
mv client.key ./inner-layer/tls/client.key
mv ca.crt ./inner-layer/tls/ca.crt

mv socket_server.crt ./outer-layer/tls/socket_server.crt
mv socket_server.key ./outer-layer/tls/socket_server.key
mv socket_ca.crt ./outer-layer/tls/socket_ca.crt

mv app_server.crt ./outer-layer/tls/app_server.crt
mv app_server.key ./outer-layer/tls/app_server.key

rm ca.key
rm ca.srl
rm socket_server.csr
rm client.csr
rm app_server.conf