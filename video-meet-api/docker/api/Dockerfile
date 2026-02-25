# Base image
FROM node:24.13-alpine3.22

# Uncomment and set necessary UID if encounter problem with user permissions with creation of folders like node_modules
# ARG UID=1001

RUN apk add --no-cache shadow bash

# RUN usermod -u $UID node

RUN npm i -g @nestjs/cli

RUN mkdir /app

WORKDIR /app
