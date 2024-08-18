FROM node:19-alpine

WORKDIR /app

COPY . /app

WORKDIR /app

RUN apk add --update npm git

USER node

ENTRYPOINT ["entrypoint.sh"]
