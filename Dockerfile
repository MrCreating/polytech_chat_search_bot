FROM node:19-alpine

WORKDIR /app

COPY . /app

WORKDIR /app

RUN apk add --update npm git

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
