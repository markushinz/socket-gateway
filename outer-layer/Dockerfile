FROM node:12

WORKDIR /usr/src/socket-gateway/outer-layer

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 443
EXPOSE 3000

CMD [ "npm", "start" ]
