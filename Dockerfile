FROM node:24-alpine

RUN npm install -g promise-retry && npm install -g npm@latest

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build && cp -r src/generated dist/

EXPOSE 22000

CMD ["node", "dist/server.js"]
