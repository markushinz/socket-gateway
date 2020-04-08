FROM node:12

WORKDIR /usr/src/socket-gateway/outer-layer

COPY package*.json ./

RUN npm ci

COPY *.js ./

EXPOSE 80
EXPOSE 3000

CMD [ "npm", "start" ]
