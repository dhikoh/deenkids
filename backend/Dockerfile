FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

ENV NODE_ENV=development
RUN npm install

COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
RUN npm prune --production

EXPOSE 4000

CMD ["node", "dist/main.js"]
