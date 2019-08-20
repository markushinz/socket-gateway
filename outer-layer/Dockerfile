FROM node:12

WORKDIR /usr/src/hello-world

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000

CMD [ "npm", "start" ]
