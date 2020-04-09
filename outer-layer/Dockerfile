FROM node:12

WORKDIR /usr/src/socket-gateway/outer-layer

COPY package*.json ./

RUN npm ci

COPY *.js ./
COPY routers ./routers
COPY tools ./tools

EXPOSE 80
EXPOSE 3000

CMD [ "npm", "start" ]
