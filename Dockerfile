FROM node:22.2.0-alpine3.19@sha256:9e8f45fc08c709b1fd87baeeed487977f57585f85f3838c01747602cd85a64bb as builder
WORKDIR /usr/src/socket-gateway
COPY package*.json ./
RUN npm ci
COPY tsconfig.json .
# COPY .eslint* ./
# COPY jest.config.js .
COPY src ./src
# RUN npm run lint
# RUN npm run test
RUN npm run build
RUN npm pack

FROM node:22.2.0-alpine3.19@sha256:9e8f45fc08c709b1fd87baeeed487977f57585f85f3838c01747602cd85a64bb as runner
ENV NODE_ENV production
WORKDIR /usr/src/socket-gateway
COPY --from=builder /usr/src/socket-gateway/socket-gateway-0.0.0.tgz .
RUN npm install -g socket-gateway-0.0.0.tgz && \
    rm -rf socket-gateway-0.0.0.tgz
USER node
ENTRYPOINT [ "socket-gateway" ]
