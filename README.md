# MealRoulette

Production-grade full stack TypeScript monorepo for a high-performance nutrition recommendation platform. Domain-driven design and clean architecture.

## Stack

- **Strict TypeScript** (no `any`), ESLint + Prettier
- **Frontend:** Vite, React, Zustand, React Query, Vitest + React Testing Library
- **API Gateway:** Node.js, Express, Apollo GraphQL
- **Services:** Jest for backend unit tests
- **Shared:** `@mealroulette/shared-types` for cross-app types

## Monorepo structure

```
MealRoulette/
├── apps/
│   ├── frontend/                 # Vite + React SPA
│   │   ├── src/
│   │   │   ├── app/               # App shell, main.tsx, App.tsx
│   │   │   ├── components/       # RecipeCard, etc.
│   │   │   ├── features/         # recipes (feature exports)
│   │   │   ├── hooks/            # useRecipes
│   │   │   ├── services/         # GraphQL client, queries
│   │   │   ├── state/            # Zustand stores (macroPreferenceStore)
│   │   │   ├── types/            # Re-exports from shared-types
│   │   │   └── test/             # RTL setup
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api-gateway/              # Express + Apollo GraphQL
│       ├── src/
│       │   ├── domain/           # Recipe entity, RecipeRepository interface
│       │   ├── application/      # GetRecipes use case
│       │   ├── infrastructure/   # InMemoryRecipeRepository
│       │   ├── graphql/          # schema, resolvers, server wiring
│       │   ├── config/           # env
│       │   └── index.ts
│       └── package.json
│
├── services/
│   ├── recommendation-service/   # Macro scoring, RecommendationEngine
│   │   ├── src/
│   │   │   ├── domain/           # MacroPreferences, RecipeScore
│   │   │   ├── application/      # RecommendationEngine, scoreRecipe (+ tests)
│   │   │   └── infrastructure/
│   │   └── jest.config.js
│   │
│   ├── nutrition-service/        # NutritionInfo, repository, mock
│   │   ├── src/
│   │   │   ├── domain/           # NutritionInfo, NutritionRepository interface
│   │   │   ├── application/     # GetNutrition
│   │   │   └── infrastructure/   # MockNutritionRepository
│   │   └── jest.config.js
│   │
│   └── analytics-service/        # Swipe events, engagement metrics
│       ├── src/
│       │   ├── domain/           # SwipeEvent, EngagementMetric
│       │   ├── application/      # aggregateSwipes (+ tests)
│       │   └── infrastructure/
│       └── jest.config.js
│
├── packages/
│   └── shared-types/             # Recipe, MacroPreferences, NutritionInfo, SwipeEvent
│       ├── src/
│       │   ├── recipe.ts
│       │   ├── macro-preferences.ts
│       │   ├── nutrition-info.ts
│       │   ├── swipe-event.ts
│       │   └── index.ts
│       └── package.json
│
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── package.json
├── .eslintrc.cjs
├── .prettierrc
└── .npmrc
```

## Scripts (root)

| Script | Description |
|--------|-------------|
| `pnpm frontend` | Run frontend dev server (Vite, port 3000) |
| `pnpm api-gateway` | Run API gateway dev server (GraphQL at :4000/graphql) |
| `pnpm test` | Run tests in all workspaces (frontend: Vitest; services: Jest) |
| `pnpm test:services` | Run tests only in recommendation, nutrition, analytics services |
| `pnpm build` | Build all packages and apps (shared-types first) |
| `pnpm benchmark:recommendation` | Build recommendation-service and run 10k/50k/100k recipe benchmark (console output) |
| `pnpm lint` | Lint all workspaces |
| `pnpm format` | Format with Prettier |
| `pnpm format:check` | Check formatting |

## Requirements

- Node ≥18
- pnpm (e.g. `npm i -g pnpm` or use `npx pnpm`)

## Quick start

```bash
pnpm install
pnpm build
pnpm frontend    # terminal 1
pnpm api-gateway # terminal 2
```

- Frontend: http://localhost:3000 (proxies /graphql to gateway)
- GraphQL: http://localhost:4000/graphql

## Deploy as PWA (Vercel + Render)

Use this setup if you want iPhone access from anywhere without keeping your Mac on:

- Backend (`api-gateway`) on Render
- Frontend (`apps/frontend`) on Vercel
- Install on iPhone via Safari -> Share -> Add to Home Screen

Step-by-step instructions are in `DEPLOY.md`.

### Dynamic meal recommendations (LLM)

Meals are generated from your preferences using a **free LLM** (no static recipe API for the deck). Set one of:

- **Groq** (recommended, free tier): [Create API key](https://console.groq.com) → in `apps/frontend` add `.env` with `VITE_GROQ_API_KEY=your_key`
- **Hugging Face**: [Create token](https://huggingface.co/settings/tokens) (Inference API) → `VITE_HF_TOKEN=your_token`

Copy `apps/frontend/.env.example` to `apps/frontend/.env` and fill in one key. Without either, the app still shows 10 mock meals per batch (ingredients and steps) so you can use it offline.

## Architecture notes

- **Domain:** Entities and value objects; repository interfaces (no framework).
- **Application:** Use cases (e.g. GetRecipes, scoreRecipe, aggregateSwipes); depend on interfaces.
- **Infrastructure:** Implementations (repositories, HTTP, DB); depend on domain/application.
- **Shared types:** All apps and services import `Recipe`, `MacroPreferences`, `NutritionInfo`, `SwipeEvent` from `@mealroulette/shared-types`.

### Recommendation engine (scoring)

- **Normalized match per macro:** Each macro gets a match score in [0, 1]; zero/missing targets handled (no divide-by-zero).
- **Weighted sum:** Default weights 0.25 each; only non-zero targets contribute.
- **Sigmoid penalty:** Optional decay for values far from target (`ScoringOptions.useSigmoidPenalty`).
- **Deterministic, clamped to [0, 1].**
- **Performance:** `pnpm benchmark:recommendation` prints 10k/50k/100k timings; Jest perf test enforces 2s for 10k recipes.
