# Stage 1: Dependency Installer
FROM node:22-alpine AS deps
WORKDIR /app

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Stage 2: Database migrator
# Run this target as a one-off job before the web container starts.
FROM deps AS migrator
WORKDIR /app

COPY prisma ./prisma
COPY prisma.config.ts ./

ENV NODE_ENV=production
CMD ["npx", "prisma", "migrate", "deploy"]

# Stage 3: Builder
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC values are compiled into the client bundle. The remaining values
# are non-secret build placeholders so real runtime credentials never enter a
# build layer or image history.
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/nexrun_build
ENV BETTER_AUTH_SECRET=build-only-placeholder-not-a-production-secret
ENV BETTER_AUTH_URL=${NEXT_PUBLIC_APP_URL}
ENV UPLOADTHING_TOKEN=build-only-placeholder-not-a-production-token
ENV MOCK_PAYMENT_MODE=true
ENV TRUST_PROXY_HEADERS=false

# Generate Prisma Client & run Next production compilation.
ENV NEXT_TELEMETRY_DISABLED=1
RUN test -n "$NEXT_PUBLIC_APP_URL"
RUN npm run db:generate
RUN npm run build

# Stage 4: Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Leverage Next.js standalone build output mode
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# ========================================================
# COPY FAIL DATABASE UNTUK RUN MIGRATION DI CONSOLE
# ========================================================
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
