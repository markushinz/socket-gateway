#!/bin/bash
branch=${1:-master}
deploy=${2:-systemctl}

sudo -u $USER git checkout $branch
sudo -u $USER git pull
sudo -u $USER rm -rf ./node_modules
sudo -u $USER npm ci

sudo -u $USER cp ./node_modules/@clr/ui/clr-ui.min.css ./public/clr-ui.min.css
sudo -u $USER cp ./node_modules/@clr/icons/clr-icons.min.css ./public/clr-icons.min.css
sudo -u $USER cp ./node_modules/@clr/icons/clr-icons.min.js ./public/clr-icons.min.js

# sudo setcap CAP_NET_BIND_SERVICE=+eip /usr/bin/node

if [ $deploy = systemctl ]; then
   systemctl restart socket-gateway-outer-layer
   systemctl status socket-gateway-outer-layer
else
  sudo -u $USER npm start
fi