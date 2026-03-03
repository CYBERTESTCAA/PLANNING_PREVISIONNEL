# ── Stage 1: build frontend ──────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
# Install root dependencies (frontend)
RUN npm install --ignore-scripts

COPY index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts tailwind.config.ts postcss.config.js components.json ./
COPY src ./src
COPY public ./public

# Build args for env vars baked at build time
ARG VITE_API_URL=/api
ARG VITE_AZURE_AD_TENANT_ID=55981225-247f-4ff6-8678-e1efb27d133e
ARG VITE_AZURE_AD_CLIENT_ID

RUN npm run build

# ── Stage 2: serve with Nginx ────────────────────────────────────────────────
FROM nginx:alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
