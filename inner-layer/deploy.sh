branch=${1:-master}

git checkout $branch
git pull
rm -rf ./node_modules
npm install

systemctl restart socket-gateway-inner-layer
systemctl status socket-gateway-inner-layer
