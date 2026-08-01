# ---- Dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci || npm install
# Prisma generate only reads the schema to emit TypeScript — it does not
# connect to the database. A dummy URL satisfies schema validation so the
# build succeeds without the real DATABASE_URL being present.
RUN DATABASE_URL="postgresql://dummy:dummy@localhost/dummy" npx prisma generate

# ---- Builder ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Run next build directly — prisma generate is already done above and
# prisma db push requires a live database so it runs at container startup.
RUN DATABASE_URL="postgresql://dummy:dummy@localhost/dummy" npx next build

# ---- Runner ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
# On startup the real DATABASE_URL is available — push schema then serve.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx next start"]
