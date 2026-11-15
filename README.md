# Minotaur

Climbing gym app for the climbing club Minotaur.

TypeScript monorepo (pnpm workspaces): a Fastify + Prisma + PostgreSQL
backend, a React + Vite web frontend, an Expo mobile app, and a shared
package of zod schemas.

## Requirements

- Node 26 (see `.nvmrc`)
- pnpm 12
- Docker, for the local PostgreSQL database

## Setup

```sh
pnpm install
docker compose up -d
cp apps/backend/.env.example apps/backend/.env
cp apps/mobile/.env.example apps/mobile/.env
pnpm --filter @repo/shared build
```

The apps use the shared package through its build output, so rebuild it
after every change to `packages/shared`.

## Run

```sh
pnpm --filter @repo/backend dev     # API on http://127.0.0.1:3000
pnpm --filter @repo/frontend dev    # web app on http://localhost:5173
pnpm --filter @repo/mobile dev      # Expo dev server
```

Each package also has `typecheck`, `lint`, and `test`:

```sh
pnpm --filter @repo/<package> test
```

Backend tests run against the separate `minotaur_test` database and need
Docker running.

## License

The code is released under the [MIT License](LICENSE).

The Minotaur name, logo, and visual identity are not covered by that license.
They belong to the club and may not be used without permission. If you fork
this project, replace them with your own.
