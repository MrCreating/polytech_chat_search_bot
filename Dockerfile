FROM node:20-alpine

WORKDIR /app

COPY . /app

RUN apk add --update npm git

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
