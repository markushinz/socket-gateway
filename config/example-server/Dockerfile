FROM node:14.15.1
WORKDIR /usr/src/example-server
COPY package*.json ./
RUN npm ci
COPY . .
RUN addgroup --gid 1427 appgroup && \
    adduser --disabled-password --gecos '' --no-create-home --gid 1427 --uid 1427 appuser
USER appuser
CMD [ "npm", "start" ]
