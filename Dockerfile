FROM node:16.13.0-alpine3.11
ENV NODE_ENV production
WORKDIR /usr/src/socket-gateway
COPY socket-gateway.tgz .
RUN npm install -g socket-gateway.tgz && \
    rm -rf socket-gateway.tgz
RUN addgroup --gid 1697 appgroup && \
    adduser --disabled-password --gecos '' --no-create-home -G appgroup --uid 1697 appuser
USER appuser
ENTRYPOINT [ "socket-gateway" ]
