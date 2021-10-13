FROM node:16.11.1-alpine3.11 as builder
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
RUN npm pack

FROM node:16.11.1-alpine3.11 as runner
ENV NODE_ENV production
WORKDIR /usr/src/socket-gateway
COPY --from=builder /usr/src/socket-gateway/socket-gateway-0.0.0.tgz .
RUN npm install -g socket-gateway-0.0.0.tgz && \
    rm -rf socket-gateway-0.0.0.tgz
RUN addgroup --gid 1697 appgroup && \
    adduser --disabled-password --gecos '' --no-create-home -G appgroup --uid 1697 appuser
USER appuser
ENTRYPOINT [ "socket-gateway" ]
