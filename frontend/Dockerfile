FROM node:22-alpine

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

COPY package*.json ./

# --include=dev forces devDependencies install even if Coolify injects NODE_ENV=production
RUN npm install --include=dev --legacy-peer-deps

COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build && chown -R appuser:appgroup /app

USER appuser

ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["npm", "run", "start"]
