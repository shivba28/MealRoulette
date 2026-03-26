# Production API gateway (GraphQL + analytics). Monorepo build: shared-types → analytics-service → api-gateway.
FROM node:20-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY services ./services
COPY apps ./apps
COPY mobile-shell ./mobile-shell

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @mealroulette/shared-types run build \
  && pnpm --filter analytics-service run build \
  && pnpm --filter api-gateway run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "apps/api-gateway/dist/index.js"]
