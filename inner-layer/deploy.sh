branch=${1:-master}
deploy=${2:-systemctl}

sudo -u $USER git checkout $branch
sudo -u $USER git pull
sudo -u $USER rm -rf ./node_modules
sudo -u $USER npm ci

if [ $deploy = systemctl ]; then
   systemctl restart socket-gateway-inner-layer
   systemctl status socket-gateway-inner-layer
else
  sudo -u $USER npm start
fi
