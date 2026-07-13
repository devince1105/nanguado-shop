FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# 1. Prune Stage
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
# Prune workspace for the NestJS API application
RUN turbo prune @repo/api --docker

# 2. Dependencies & Build Stage
FROM base AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install all dependencies (including devDependencies for building)
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Copy source code and build
COPY --from=builder /app/out/full/ .
COPY --from=builder /app/tsconfig.json ./tsconfig.json
RUN pnpm run build --filter=@repo/api

# Prune devDependencies to keep the final image minimal
RUN CI=true pnpm prune --prod

# 3. Production Runner Stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy the pruned workspace directly to keep symlinks intact
COPY --from=installer /app .

EXPOSE 4000
ENV PORT=4000

# Start NestJS application
CMD ["node", "apps/api/dist/main.js"]
