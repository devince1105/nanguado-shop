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
# Prune the workspace to get only frontend app & its internal package dependencies
RUN turbo prune @repo/web --docker

# 2. Dependencies & Build Stage
FROM base AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app

# First install dependencies based on pruned package.json
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Copy source code and build the project
COPY --from=builder /app/out/full/ .
COPY --from=builder /app/tsconfig.json ./tsconfig.json
# Make sure to run compile check and build
RUN pnpm run build --filter=@repo/web

# 3. Production Runner Stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built standalone server outputs (includes server.js and compiled node_modules)
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

# Next.js standalone runs by executing server.js in the app package directory
CMD ["node", "apps/web/server.js"]
