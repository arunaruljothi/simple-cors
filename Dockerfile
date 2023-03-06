
FROM node:18.14.2-bullseye-slim

COPY dist package.json package-lock.json /home/

ENV NODE_ENV=production

WORKDIR /home
RUN npm install
CMD "node" "server.js"
