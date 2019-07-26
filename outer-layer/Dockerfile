FROM node:12

WORKDIR /usr/src/socket-gateway/outer-layer

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000
EXPOSE 3001

CMD [ "npm", "start" ]
