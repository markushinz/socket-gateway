#!/bin/bash

openssl req -x509 -newkey rsa:4096 -nodes -keyout ca.key -out ca.crt -days 3650 -subj '/CN=Socket Gateway Root CA'
openssl req -newkey rsa:2048 -nodes -keyout inner.key -out inner.csr -subj '/CN=Socket Gateway Inner Layer'
openssl x509 -req -days 3650 -in inner.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out inner.crt -sha256
openssl req -newkey rsa:2048 -nodes -keyout outer.key -out outer.csr -subj '/CN=Socket Gateway Outer Layer'
openssl x509 -req -days 3650 -in outer.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out outer.crt -sha256
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout localhost.key -out localhost.crt -config localhost.conf -extensions 'v3_req'

rm ca.srl
rm outer.csr
rm inner.csr
