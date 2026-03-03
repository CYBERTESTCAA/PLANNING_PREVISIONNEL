# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --ignore-scripts

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:20-slim AS runtime
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

# SQLite data will be stored in a volume
RUN mkdir -p /data
ENV DATABASE_URL="file:/data/planning.sqlite"

EXPOSE 3001

# Apply migrations safely (no data loss) then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
