FROM node:22-alpine

RUN apk add --no-cache openssl postgresql-client

WORKDIR /app

COPY package*.json ./

ENV NODE_ENV=development
RUN npm install

COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production

EXPOSE 4000

CMD ["npm", "run", "start:prod"]
