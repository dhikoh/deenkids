FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install --ignore-scripts
RUN npx prisma generate || true

COPY . .
RUN npx prisma generate && npm run build

RUN npm prune --production

EXPOSE 4000

CMD ["npm", "run", "start:prod"]
