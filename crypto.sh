#!/bin/bash

openssl req -x509 -newkey rsa:4096 -nodes -keyout ca.key -out ca.crt -days 3650 -subj '/CN=Socket Gateway Root CA'
openssl req -newkey rsa:2048 -nodes -keyout client.key -out client.csr -subj '/CN=Socket Gateway Inner Layer'
openssl x509 -req -days 3650 -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt -sha256
openssl req -newkey rsa:2048 -nodes -keyout socket_server.key -out socket_server.csr -subj '/CN=Socket Gateway Outer Layer'
openssl x509 -req -days 3650 -in socket_server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out socket_server.crt -sha256
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout app_server.key -out app_server.crt -config localhost.conf -extensions 'v3_req'

cp ca.crt socket_ca.crt
touch app_ca.crt

mv client.crt ./inner-layer/tls/client.crt
mv client.key ./inner-layer/tls/client.key
mv ca.crt ./inner-layer/tls/ca.crt

mv socket_server.crt ./outer-layer/tls/socket_server.crt
mv socket_server.key ./outer-layer/tls/socket_server.key
mv socket_ca.crt ./outer-layer/tls/socket_ca.crt

mv app_server.crt ./outer-layer/tls/app_server.crt
mv app_server.key ./outer-layer/tls/app_server.key
mv app_ca.crt ./outer-layer/tls/app_ca.crt

rm ca.key
rm ca.srl
rm socket_server.csr
rm client.csr