#!/bin/bash
outerLayer=${2:-outer-layer-service} # this has to be a valid DNS name

echo -e "[req]\ndistinguished_name = req_distinguished_name\nx509_extensions = v3_req\nprompt = no\n[req_distinguished_name]\nCN = socket-gateway-inner-layer\n[v3_req]\nsubjectAltName = @alt_names\n[alt_names]\nDNS.1 = socket-gateway-inner-layer" > innerLayer.conf
openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout innerLayer.key -out innerLayer.crt -config innerLayer.conf -extensions "v3_req"
rm innerLayer.conf

echo -e "[req]\ndistinguished_name = req_distinguished_name\nx509_extensions = v3_req\nprompt = no\n[req_distinguished_name]\nCN = $outerLayer\n[v3_req]\nsubjectAltName = @alt_names\n[alt_names]\nDNS.1 = $outerLayer" > outerLayer.conf
openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout outerLayer.key -out outerLayer.crt -config outerLayer.conf -extensions "v3_req"
rm outerLayer.conf

cp innerLayer.crt ./config-inner-layer/innerLayer.crt
mv innerLayer.key ./config-inner-layer/innerLayer.key
cp outerLayer.crt ./config-inner-layer/outerLayer.crt

cp outerLayer.crt ./config-outer-layer/server.crt
cp outerLayer.key ./config-outer-layer/server.key
mv outerLayer.crt ./config-outer-layer/outerLayer.crt
mv outerLayer.key ./config-outer-layer/outerLayer.key
mv innerLayer.crt ./config-outer-layer/innerLayer.crt

docker-compose up --build
