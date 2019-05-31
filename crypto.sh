#!/bin/bash
innerLayer=${1:-localhost}
outerLayer=${2:-localhost}

echo -e "[req]\ndistinguished_name = req_distinguished_name\nx509_extensions = v3_req\nprompt = no\n[req_distinguished_name]\nCN = $innerLayer\n[v3_req]\nsubjectAltName = @alt_names\n[alt_names]\nDNS.1 = $innerLayer" > innerLayer.conf
openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout innerLayer.key -out innerLayer.crt -config innerLayer.conf -extensions "v3_req"
rm innerLayer.conf

echo -e "[req]\ndistinguished_name = req_distinguished_name\nx509_extensions = v3_req\nprompt = no\n[req_distinguished_name]\nCN = $outerLayer\n[v3_req]\nsubjectAltName = @alt_names\n[alt_names]\nDNS.1 = $outerLayer" > outerLayer.conf
openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout outerLayer.key -out outerLayer.crt -config outerLayer.conf -extensions "v3_req"
rm outerLayer.conf

cp innerLayer.crt ./inner-layer/tls/innerLayer.crt
mv innerLayer.key ./inner-layer/tls/innerLayer.key
cp outerLayer.crt ./inner-layer/tls/outerLayer.crt

mv outerLayer.crt ./outer-layer/tls/outerLayer.crt
mv outerLayer.key ./outer-layer/tls/outerLayer.key
mv innerLayer.crt ./outer-layer/tls/innerLayer.crt