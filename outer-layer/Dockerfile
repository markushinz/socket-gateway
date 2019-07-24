FROM node:12

WORKDIR /usr/src/socket-gateway/outer-layer

COPY package*.json ./

RUN npm ci

RUN mkdir public
RUN  cp ./node_modules/@clr/ui/clr-ui.min.css ./public/clr-ui.min.css
RUN  cp ./node_modules/@clr/ui/clr-ui.min.css.map ./public/clr-ui.min.css.map
RUN  cp ./node_modules/@clr/icons/clr-icons.min.css ./public/clr-icons.min.css
RUN  cp ./node_modules/@clr/icons/clr-icons.min.css.map ./public/clr-icons.min.css.map
RUN  cp ./node_modules/@clr/icons/clr-icons.min.js ./public/clr-icons.min.js

COPY . .

EXPOSE 3000
EXPOSE 3001

CMD [ "npm", "start" ]
