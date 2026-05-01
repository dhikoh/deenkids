FROM node:22-alpine

RUN apk add --no-cache openssl postgresql-client
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate && npm run build

# Create upload dirs owned by app user
RUN mkdir -p uploads/proofs uploads/banners uploads/messages backups && \
    chown -R appuser:appgroup /app

USER appuser

ENV NODE_ENV=production

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:4000/api/content/tags || exit 1

CMD ["npm", "run", "start:prod"]
