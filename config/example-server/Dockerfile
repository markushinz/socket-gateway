FROM node:12

WORKDIR /usr/src/example-server

COPY package*.json ./

RUN npm ci

COPY . .

CMD [ "npm", "start" ]
