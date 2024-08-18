FROM node:19-alpine

WORKDIR /app

COPY . /app

WORKDIR /app

RUN apk add --update npm

RUN npm install

USER node

CMD node src/index.js
