FROM node:16.1.0-alpine3.11 as builder
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

FROM node:16.1.0-alpine3.11 as runner
ENV SG_MODE outer-layer
WORKDIR /usr/src/socket-gateway
COPY package.json .
COPY --from=builder /usr/src/socket-gateway/dist ./dist
COPY --from=builder /usr/src/socket-gateway/node_modules ./node_modules
RUN addgroup --gid 1697 appgroup && \
    adduser --disabled-password --gecos '' --no-create-home -G appgroup --uid 1697 appuser
USER appuser
CMD [ "npm", "start" ]
