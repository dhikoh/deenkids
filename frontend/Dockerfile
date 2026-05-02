# ── Stage 1: Build (Coolify injects ARGs here after this FROM) ──
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev --legacy-peer-deps

COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ── Stage 2: Production (minimal image, no node_modules) ──
FROM node:22-alpine AS runner

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

ENV NODE_ENV=production

# Copy only standalone output + static assets + public folder
COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static
COPY --from=builder --chown=appuser:appgroup /app/public ./public

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://localhost:3000/ || exit 1

# standalone mode: must use "node server.js", NOT "next start"
CMD ["node", "server.js"]
