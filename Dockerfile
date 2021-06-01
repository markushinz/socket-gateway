FROM node:16.2.0-alpine3.11 as builder
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

FROM node:16.2.0-alpine3.11 as runner
ENV SG_MODE outer-layer
ENV NODE_ENV production
WORKDIR /usr/src/socket-gateway
COPY package*.json .
RUN npm ci
COPY --from=builder /usr/src/socket-gateway/dist ./dist
RUN addgroup --gid 1697 appgroup && \
    adduser --disabled-password --gecos '' --no-create-home -G appgroup --uid 1697 appuser
USER appuser
CMD [ "npm", "start" ]
