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

All at once: `pnpm dev` starts the database, then shared (build in watch
mode), backend, frontend, and mobile in a 2x2 grid of panes.

- In iTerm: a new tab in the current window, split into the four panes.
  Stop a service with Ctrl+C in its pane.
- Elsewhere: one tmux session (`brew install tmux`) with the four panes.
  Running `pnpm dev` again reattaches; `pnpm dev:stop` stops every server.

Or one at a time:

```sh
pnpm --filter @repo/backend dev     # API on http://127.0.0.1:3000
pnpm --filter @repo/frontend dev    # web app on http://localhost:5173
pnpm --filter @repo/mobile dev      # Expo dev server
```

## Logins

Only trainers and admins log in, with their member email. There is no
sign-up and no password reset yet; logins are managed with backend commands,
which ask for the password without showing it:

```sh
# First admin: creates the member and the login
pnpm --filter @repo/backend login:create --org-id 1 --name <name> --surname <surname> --birthday <YYYY-MM-DD> --email <email> --role admin
# Existing member becomes trainer or admin (uses the member's email)
pnpm --filter @repo/backend login:create --member-id <id> --role trainer
pnpm --filter @repo/backend login:set-password --member-id <id>
pnpm --filter @repo/backend member:set-role --member-id <id> --role <child|member|trainer|admin>
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
