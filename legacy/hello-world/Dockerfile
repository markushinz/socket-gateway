FROM node:12

WORKDIR /usr/src/hello-world

COPY package*.json ./

RUN npm ci

COPY . .

CMD [ "npm", "start" ]
