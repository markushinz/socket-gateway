FROM node:12

WORKDIR /usr/src/socket-gateway/inner-layer

COPY package*.json ./

RUN npm ci

COPY . .

CMD [ "npm", "start" ]
