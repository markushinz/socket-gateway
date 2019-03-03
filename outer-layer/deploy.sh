branch=${1:-master}

sudo -u $USER git checkout $branch
sudo -u $USER git pull
sudo -u $USER rm -rf ./node_modules
sudo -u $USER npm install

systemctl restart socket-gateway-outer-layer
systemctl status socket-gateway-outer-layer
