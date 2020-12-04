FROM node:14.15.1 as builder
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

FROM node:14.15.1 as runner
ENV SG_MODE outer-layer
RUN addgroup --gid 1697 appgroup && \
    adduser --disabled-password --gecos '' --no-create-home --gid 1697 --uid 1697 appuser
USER appuser
WORKDIR /usr/src/socket-gateway
COPY package.json .
COPY --from=builder /usr/src/socket-gateway/dist ./dist
COPY --from=builder /usr/src/socket-gateway/node_modules ./node_modules
CMD [ "npm", "start" ]
