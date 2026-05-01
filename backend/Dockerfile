# ── Build stage ──
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

# Force development to install devDependencies (@nestjs/cli, typescript, etc.)
ENV NODE_ENV=development
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

# ── Production stage ──
FROM node:22-alpine

RUN apk add --no-cache openssl postgresql-client
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=builder --chown=appuser:appgroup /app/package.json .

# Create upload directories owned by app user
RUN mkdir -p uploads/proofs uploads/banners uploads/messages backups && \
    chown -R appuser:appgroup uploads backups

USER appuser

ENV NODE_ENV=production

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:4000/api/content/tags || exit 1

CMD ["node", "dist/main.js"]
