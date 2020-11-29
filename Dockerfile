FROM node:12 as builder
WORKDIR /usr/src/socket-gateway
COPY package*.json ./
RUN npm ci
COPY tsconfig.json .
COPY .eslint* ./
COPY jest.config.js .
COPY src ./src
RUN npm run lint
RUN npm run test
RUN npm run build

FROM node:12 as runner
ENV SG_MODE outer-layer
WORKDIR /usr/src/socket-gateway
COPY package.json .
COPY --from=builder /usr/src/socket-gateway/dist ./dist
COPY --from=builder /usr/src/socket-gateway/node_modules ./node_modules
CMD [ "npm", "start" ]
