# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Runtime/Framework**: NestJS 11 on Fastify (`@nestjs/platform-fastify`), TypeScript (ES2023, NodeNext modules)
- **Database**: PostgreSQL via Drizzle ORM (schema in `src/frameworks/data-services/postgres/schema.ts`, migrations in `drizzle/migrations`)
- **Cache/Queue**: Redis (`ioredis`, `@keyv/redis`), BullMQ + Bull for background jobs
- **Search**: Elasticsearch 8 (`pkg/elasticsearch` provides a local Dockerfile)
- **Auth**: Firebase Admin (identity) + JWT (`passport-jwt`) + Casbin RBAC with `casbin-pg-adapter` (model at `src/common/config/rbac_model.conf`)
- **Observability**: Sentry (`@sentry/nestjs`), Prometheus (`@willsoto/nestjs-prometheus`, `/metrics`), custom logging interceptor
- **Misc**: Cloudinary uploads, nodemailer, puppeteer-core (chromium via `@sparticuz/chromium`), socket.io websockets, `node-vault` for secret loading
- **Package manager**: CI uses **Bun** (`bun install`, `bun run …`) and `bun.lock` is the source of truth; `package-lock.json` is also committed. Prefer Bun to match CI.

## Common commands

```bash
# Dev server (watch mode)
bun run start:dev          # or: npm run start:dev

# Worker process (separate Nest entrypoint: main-worker)
bun run worker:dev

# Production
bun run build && bun run start:prod

# Lint / format (also enforced by Husky pre-commit via lint-staged)
bun run lint               # eslint --fix on src/apps/libs/test
bun run eslint             # eslint . without --fix
bun run format             # prettier --write

# Tests (Jest, rootDir = src, *.spec.ts). No unit specs exist in src yet;
# only test/app.e2e-spec.ts boilerplate.
bun run test
bun run test:watch
bun run test:cov
bun run test -- path/to/file.spec.ts        # single file
bun run test -- -t "test name pattern"      # single test by name
bun run test:e2e                            # uses test/jest-e2e.json

# Drizzle (DATABASE_URL must be set; see .env.example)
bun run db:generate        # generate SQL from schema.ts diff
bun run db:migrate         # apply migrations
bun run db:push            # push schema directly (dev)
bun run db:pull            # introspect existing DB
bun run db:studio
bun run db:seed            # bun drizzle/seed/index.ts
bun run db:seed:exam
bun run db:seed:exam-questions

# Swagger JSON export
bun run swagger:json:generate    # writes via scripts/generate-swagger-json.ts

# Firebase identity sync utility
bun run sync:firebase-identities
```

`casbin:*` scripts in `package.json` reference files (`casbin_rule.config.ts`, `migrate-casbin.ts`) that are not present in the repo — they appear to be legacy. Don't trust them blindly; verify before invoking. Policies can be managed via the `/api/v1/casbin/*` endpoints (see `docs/CASBIN_SETUP_GUIDE.md`).

## Architecture

The codebase follows a Clean Architecture layout. Modules wire dependencies inward: `interfaces → use-cases → core abstracts ← frameworks (concrete impls)`.

```
src/
├── main.ts                  # Bootstrap: loadVaultIntoEnv → Fastify app
├── instrument.ts            # MUST be imported first (Sentry instrumentation)
├── app.module.ts            # Root module — imports every *UseCasesModule and registers every controller
├── core/
│   ├── entities/            # Plain domain types (User, Job, Cv, Organization, etc.)
│   └── abstracts/           # Interfaces / DI tokens (IBloomFilterService, ILoggerServices, repositories/*)
├── use-cases/<feature>/     # Application logic. Each feature has *.use-case.ts + *-use-cases.module.ts
├── frameworks/              # Concrete adapters bound to core abstracts
│   ├── data-services/postgres   # Drizzle repositories + schema.ts (single source of truth for the DB)
│   ├── data-services/elasticsearch
│   ├── auth-services/{firebase,casbin,strategies}
│   ├── ai-services, bloom-filter, email-services, logger-services
│   ├── message-queue, notification, otp-services, redis, schedulers, ssh, storage, websocket
├── interfaces/
│   ├── controllers/<feature>/   # HTTP controllers — thin, delegate to use-case classes
│   └── dtos/                    # Request/response shapes with class-validator decorators
├── services/                # Cross-cutting feature flag / shared services
└── common/
    ├── config/              # env validation, app config, swagger, prometheus, rbac_model.conf, vault-loader
    ├── constants/           # roles, enums
    ├── decorators/, interceptors/, middlewares/, templates/, types/, utils/
```

Key conventions:

- **Path alias**: `@/*` → `./src/*` (configured in `tsconfig.json` and resolved at runtime via `tsconfig-paths`). Prefer `@/use-cases/foo` over deep relative imports.
- **Adding a feature**: create `core/entities/<feature>.entity.ts` + `core/abstracts/repositories/<feature>-repository.abstract.ts`, implement the repo under `frameworks/data-services/postgres/repositories/`, write the use-case under `use-cases/<feature>/`, expose it via a controller in `interfaces/controllers/<feature>/`, then register the use-case module + controller in `src/app.module.ts`.
- **DB schema**: edit `src/frameworks/data-services/postgres/schema.ts`, then `bun run db:generate` to produce a migration in `drizzle/migrations/`. Don't hand-write migrations except for special cases like the existing `add_casbin_rule_indexes.sql`.
- **Secrets**: `loadVaultIntoEnv()` runs before `AppModule` import in `main.ts`. Vault-loaded values appear in `process.env`. `.env` / `.env.development` / `.env.production` are also loaded by `ConfigModule`. Env is validated by `validateConfig` in `src/common/config/env.config.ts`.
- **Sentry**: `src/instrument.ts` is the very first import in `main.ts` — preserve this ordering when refactoring bootstrap.
- **Rate limiting**: `RateLimitMiddleware` is applied to all routes except `/health`, `users/me`, `auth/refresh` (see `app.module.ts:241`). Tunable via `RATE_LIMIT_CAPACITY` / `RATE_LIMIT_REFILL_RATE`.
- **Two entrypoints**: HTTP app (`src/main.ts`) and worker (`src/main-worker.ts` per `package.json`; uses `--entryFile main-worker`). When adding background processors, target the worker entry.
- **Auth/RBAC**: protect routes with `JwtAuthGuard` + `CasbinGuard`; use `@CasbinPermission(resource, action)` decorator. Roles enumerated in `src/common/constants/roles.ts`. Domain-scoped (organization) permissions use Casbin `p2`/`g2` policies — see `docs/CASBIN_SETUP_GUIDE.md`.

## Adjacent code (not part of the Nest app)

- `crawl_jobs/` — Python 3.13 job scraper (ITViec, LinkedIn, TopCV, JobsGO, VietnamWorks). Run via `python crawl_jobs/main.py --db-url <…>`. Triggered on a schedule by `.github/workflows/crawl.yaml`.
- `pkg/elasticsearch/` — custom Elasticsearch image used by `docker-compose-local.yaml`.
- `data/` — JSON seed fixtures (skill references, exam question banks).

## CI/CD

`.github/workflows/cicd.yaml` runs on PRs and pushes to `dev` and `main`:

1. **CI** (self-hosted runner): `bun install` → `bun run lint` → `bun run build`. Lint and build failures both block.
2. **CD** (push only): builds & pushes `ghcr.io/ngocnhan2k4/ai-recruit-be:{dev|latest}`, then SSHes into the dev/prod host and `docker compose up -d`. `main` deploys to `latest` + `docker-compose.yaml`; `dev` deploys to `dev` + `docker-compose-dev.yaml`.

Husky pre-commit runs `eslint` + `prettier --write` against staged `src/**/*.{js,jsx,ts,tsx}` via `lint-staged`.

## Documentation hints

- `docs/architecture.md` — clean-architecture layer descriptions (Vietnamese).
- `docs/CASBIN_SETUP_GUIDE.md` — full RBAC model, policy examples, and API surface.
- `docs/JOB_API_DOCUMENTATION.md`, `docs/business.md`, `docs/swagger.json` — domain/API references.
- Swagger UI is mounted at `${globalPrefix}/docs` when the app is running.
