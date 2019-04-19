#!/bin/bash
branch=${1:-master}
deploy=${2:-systemctl}

sudo -u $USER git checkout $branch
sudo -u $USER git pull
sudo -u $USER rm -rf ./node_modules
sudo -u $USER npm ci

sudo -u $USER rm -f ./public/clr-ui.min.css
sudo -u $USER cp ./node_modules/@clr/ui/clr-ui.min.css ./public/clr-ui.min.css

if [ $deploy = systemctl ]; then
   systemctl restart socket-gateway-outer-layer
   systemctl status socket-gateway-outer-layer
else
  sudo -u $USER npm start
fi