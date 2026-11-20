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
pnpm --filter @repo/enrollment build
pnpm --filter @repo/backend prisma migrate deploy
pnpm --filter @repo/backend db:seed
pnpm --filter @repo/backend login:create --org-id 1 --name <name> --surname <surname> --email <email> --role admin
```

- `docker compose up -d` starts PostgreSQL on port 5433 with two databases:
  `minotaur_dev` for the app and `minotaur_test` for the backend tests.
- `migrate deploy` creates the tables.
- `db:seed` fills the dev database with invented demo data: the org (id 1),
  two trainers, groups, children and attendance. The trainers' password is
  `DEMO_TRAINER_PASSWORD` in `apps/backend/src/cli/seed.ts`.
- `login:create` adds your own admin to that org. It asks for a password of at
  least 12 characters.

Then run `pnpm dev` (below) and log in on http://localhost:5173.

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

### Another database

The backend uses `DATABASE_URL` from `apps/backend/.env`. A `DATABASE_URL`
set in the shell wins, and `pnpm dev` hands it to every pane. To keep real
data apart from the demo data, create a second database in the same container
and start with its URL:

```sh
docker compose exec postgres psql -U minotaur -d minotaur_dev -c "CREATE DATABASE minotaur_prod;"
export PROD_DB=postgresql://minotaur:minotaur@localhost:5433/minotaur_prod
DATABASE_URL=$PROD_DB pnpm --filter @repo/backend prisma migrate deploy
# The first org (id 1); the next ones are added in the app
docker compose exec postgres psql -U minotaur -d minotaur_prod -c \
  "INSERT INTO org (name, \"contactName\", email, \"updatedAt\") VALUES ('<club>', '<contact>', '<email>', now());"
DATABASE_URL=$PROD_DB pnpm --filter @repo/backend login:create --org-id 1 --name <name> --surname <surname> --email <email> --role admin
DATABASE_URL=$PROD_DB pnpm dev
```

The same prefix works for every backend command. After
pulling new migrations, run `migrate deploy` with it again. Its tmux session is
`minotaur-prod`.

## Logins

Only trainers and admins log in, with their member email. There is no
sign-up and no password reset yet; logins are managed with backend commands,
which ask for the password without showing it:

```sh
# First admin: creates the member and the login
pnpm --filter @repo/backend login:create --org-id 1 --name <name> --surname <surname> [--birthday <YYYY-MM-DD>] --email <email> --role admin
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

The Minotaur and SPK Minotaur names, logos, and visual identity are not
covered by that license, including the logo files in earlier commits of this
repository. They belong to the club and may not be used without its written
permission. The logo files in `apps/frontend/src/assets/` and
`apps/mobile/assets/` are neutral placeholders; if you fork this project,
replace them with your own.
