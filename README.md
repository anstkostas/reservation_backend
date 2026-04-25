# Reservation App - Backend Service

A robust, secure REST API service built with **Express.js** and **PostgreSQL**. It powers the reservation platform by handling authentication, reservations, restaurant management, and user profiles.

> **TIP**
> Want to get up and running quickly? Jump to the [Quick Connect](#quick-connect) section at the end of this document.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [PostgreSQL Connection](#postgresql-connection)
- [Environment Variables](#environment-variables)
- [Migrations & Seed Data](#migrations--seed-data)
- [Project Structure & Patterns](#project-structure--patterns)
- [Service Layer with Business Logic](#service-layer-with-business-logic)
- [Database Models](#database-models)
- [API Routes Overview](#api-routes-overview)
- [Error Handling](#error-handling)
- [Running the Server](#running-the-server)
- [Quick Connect](#quick-connect)

---

## Tech Stack

- **Language**: [TypeScript](https://www.typescriptlang.org/) (strict mode, ESM)
- **Core**: [Node.js](https://nodejs.org/) + [Express.js](https://expressjs.com/) v5
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/) v7 (with `@prisma/adapter-pg`)
- **Authentication**: [JWT](https://www.npmjs.com/package/jsonwebtoken) + HttpOnly Cookies
- **Security**: [Bcryptjs](https://www.npmjs.com/package/bcryptjs) (Hashing) + [Cors](https://www.npmjs.com/package/cors)
- **Validation**: [Zod](https://zod.dev/)
- **Linting**: [ESLint](https://eslint.org/) + [typescript-eslint](https://typescript-eslint.io/)
- **Utilities**: [Dotenv](https://www.npmjs.com/package/dotenv)
- **Documentation**: [Swagger](https://swagger.io/) + [Swagger UI](https://swagger.io/swagger-ui/) at `/api/docs`
- **Dev Runtime**: [tsx](https://tsx.is/) (TypeScript execution, no compile step in dev)

---

## Architecture

The application follows a strict layered architecture — no layer may skip another:

```text
Request → Router → Controller → Service → Repository → Database
```

1. **Routes** (`src/routes`): Defines endpoints, attaches middleware (auth, role, validation).
2. **Controllers** (`src/controllers`): Thin — parses input, calls service, returns response. No business logic.
3. **Services** (`src/services`): All business logic lives here. Calls repositories. Throws typed errors.
4. **Repositories** (`src/repositories`): All database access via Prisma. No business logic.
5. **DTOs** (`src/dtos`): Shape and type outgoing responses. Input sanitization absorbed by Zod schemas.

---

## PostgreSQL Connection

This project connects to a **PostgreSQL** database using **Prisma** with the `@prisma/adapter-pg` driver adapter.

### Connection strategy

The app supports two connection modes, controlled by environment variables:

**Option A — Single connection URL (recommended for production)**

```bash
DB_URL="postgresql://user:password@host:5432/dbname"
```

**Option B — Individual credentials (convenient for local dev)**

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_db
DB_USER=your_user
DB_PASSWORD=your_password
```

If `DB_URL` is set, it takes priority. If not, the app builds the connection from individual vars.

> **Important:** Prisma CLI commands (`prisma migrate`, `prisma db seed`) read from `.env`, not `.env.development`.
> Set `DATABASE_URL` in `.env` with your real credentials so migrations and seeding work from the CLI.

### After cloning

Prisma generates its client into `src/generated/prisma/` — this folder is gitignored.
Run `prisma generate` after every `npm install`:

```bash
npm install
npx prisma generate
```

---

## Environment Variables

Create `.env.development` in the backend root:

```env
# Server
PORT=
HOST=
FRONTEND_URL=

# Database — use DB_URL (single string) OR individual vars (DB_URL takes priority)
DB_URL=
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=

# Auth
JWT_SECRET=
JWT_EXPIRES_IN=

# Cookie
COOKIE_NAME=
COOKIE_MAX_AGE=
```

Also create `.env` in the backend root with `DATABASE_URL` for Prisma CLI:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

See `.env.example` for all keys without values.

---

## Migrations & Seed Data

This project uses **Prisma** to manage the database schema and seed data.

### Migrations

```bash
# Apply all pending migrations
npx prisma migrate dev

# Reset DB — drops, recreates, migrates, then seeds
npx prisma migrate reset
```

### Seed Data

```bash
# Seed the database with demo users, restaurants, and reservations
npx prisma db seed
```

The seed script is registered in `package.json`:

```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

Seeding also runs automatically after `prisma migrate dev` and `prisma migrate reset`.

### Other useful Prisma commands

```bash
# Regenerate the Prisma client after schema changes
npx prisma generate

# Push schema changes directly without a migration file (prototyping only)
npx prisma db push

# Open Prisma Studio — visual DB browser
npx prisma studio
```

---

## Project Structure & Patterns

```text
src/
  config/           # env.ts (env loading), prismaClient.ts (Prisma singleton)
  constants/        # HTTP status codes, messages, enums
  controllers/      # Thin route handlers — one file per resource
  docs/             # Swagger setup
  dtos/             # Output shaping — typed with Prisma generated types
  errors/           # Custom error classes (ValidationError, NotFoundError, etc.)
  generated/        # Prisma generated client — do not edit (gitignored)
  middlewares/      # authMiddleware, roleMiddleware, validate, globalErrorHandler
  repositories/     # All DB queries via Prisma — one file per model
  routes/           # Express routers — one file per resource
  services/         # Business logic — one file per domain
  types/            # Express Request extension (req.user)
  utils/            # Pure helpers (date/time validation, response formatting)
  validation/       # Zod schemas for request validation
  app.ts            # Express app setup
  server.ts         # Server entry point
```

### Repositories (Data Access Layer)

- All database access is via Prisma — no raw SQL except `$queryRaw` for `SELECT FOR UPDATE` in reservation capacity checks
- One repository object per model: `userRepository`, `restaurantRepository`, `reservationRepository`
- Transaction clients (`Prisma.TransactionClient`) are passed down from services

### DTOs

- **Input DTOs**: Replaced by Zod schema `.transform()` — sanitization happens at validation
- **Output DTOs**: Typed functions that shape Prisma model output for API responses

### Validation (Zod)

- Schemas in `src/validation/` — one file per resource
- Applied via `validate` middleware: `validate(schema)` for body, `validate(schema, "params")` for params
- Types inferred via `z.infer<typeof schema>` — never manually duplicated

---

## Service Layer with Business Logic

### 🔐 Auth Service (`authService.ts`)

- **Login**: Validates email + bcrypt password match. Returns `UserOutputDTO` + signed JWT.
- **Signup**: Delegates to `userService.createUser`. Returns `UserOutputDTO` + signed JWT.

### 👤 User Service (`userService.ts`)

- **Create User (Transactional)**: Hashes password, derives role from presence of `restaurantId`, creates user, optionally assigns restaurant ownership — all in one transaction.
- **List Unowned Restaurants**: Returns restaurants where `ownerId IS NULL`.

### 🏪 Restaurant Service (`restaurantService.ts`)

- **Get All / Get By ID**: Returns `RestaurantOutputDTO`. Throws `NotFoundError` if ID doesn't exist.

### 📅 Reservation Service (`reservationService.ts`)

The core transactional engine of the application.

#### Create Reservation

- **Transactional**: Yes.
- **Guards**: Customer role only. Date/time validated (future, within 2-month window). Capacity check with `SELECT FOR UPDATE` to prevent overbooking race conditions.

#### Update Reservation

- **Transactional**: Yes (when date/time changes).
- **Guards**: Ownership check. Active status only. Re-runs capacity check for new slot, excluding the customer's own current reservation.

#### Cancel Reservation

- **Guards**: Active status only. Ownership check.
- **Logic**: Soft delete — sets status to `canceled`, row is never deleted.

#### Resolve Reservation

- **Role**: Owner only.
- **Guards**: Owner must own the restaurant linked to the reservation. Active status only.
- **Status**: `completed` or `no-show`.

---

## Database Models

### User

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key, auto-generated |
| firstname | String | |
| lastname | String | |
| email | String | Unique |
| password | String | Bcrypt hash — never returned in output |
| role | Enum | `customer` \| `owner` |

### Restaurant

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key, auto-generated |
| name | String | |
| description | String | |
| address | String | |
| phone | String | |
| capacity | Int | Max simultaneous active reservations — NOT headcount |
| logoUrl | String | |
| coverImageUrl | String | |
| ownerId | UUID? | FK → User; null = unowned |

### Reservation

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key, auto-generated |
| date | Date | Reservation date |
| time | DateTime | Stored as Prisma DateTime; displayed as HH:MM |
| persons | Int | Informational only — 1 reservation = 1 table slot |
| status | Enum | `active` \| `canceled` \| `completed` \| `no_show` |
| restaurantId | UUID | FK → Restaurant |
| customerId | UUID | FK → User |

> **Note on capacity:** `capacity` is the maximum number of *simultaneous active reservations*, not the total number of guests. One reservation occupies one table regardless of party size.

> **Note on `no_show`:** Prisma stores the value as `no_show` internally. The DB column maps it to `no-show` via `@map("no-show")` in `schema.prisma`.

---

## API Routes Overview

### Auth (`/api/auth`)

| Method | Path | Access |
|---|---|---|
| POST | `/signup` | Public |
| POST | `/login` | Public |
| POST | `/logout` | Auth required |
| GET | `/me` | Auth required |

### Restaurants (`/api/restaurants`)

| Method | Path | Access |
|---|---|---|
| GET | `/` | Public |
| GET | `/:id` | Public |

### Reservations (`/api/reservations`)

| Method | Path | Access |
|---|---|---|
| POST | `/restaurants/:restaurantId` | Customer only |
| GET | `/my-reservations` | Customer only |
| PUT | `/:id` | Customer only (own reservation) |
| DELETE | `/:id` | Customer only (soft cancel) |
| POST | `/:id/resolve` | Owner only |
| GET | `/owner-reservations` | Owner only |

### Users (`/api/users`)

| Method | Path | Access |
|---|---|---|
| GET | `/unowned-restaurants` | Public (used in signup flow) |

Full interactive documentation available at `/api/docs` (Swagger UI).

---

## Error Handling

All errors bubble up to `globalErrorHandler` middleware — no inline error responses in controllers.

**Response format:**

```json
{ "success": false, "message": "Human-readable message", "statusCode": 400 }
```

**Custom error classes** (`src/errors/`):

- `ValidationError` — 400. Also handles Prisma constraint errors via `fromPrisma()`
- `NotAuthenticatedError` — 401
- `ForbiddenError` — 403
- `NotFoundError` — 404

Stack trace is included in responses in `development` mode only.

---

## Running the Server

```bash
# Install dependencies and generate Prisma client
npm install
npx prisma generate

# Development (tsx watch — no compile step)
npm run dev

# Type check only (no emit)
npm run typecheck

# Lint
npm run lint

# Build for production
npm run build
npm start
```

Server default: `http://localhost:22000`
Swagger docs: `http://localhost:22000/api/docs`

---

## Quick Connect

1. `npm install` for both frontend and backend.
2. Create a PostgreSQL database and note your credentials.
3. Copy `.env.example` to `.env.development` and fill in your values — at minimum: `DB_URL` or the individual `DB_*` vars, `JWT_SECRET`, `COOKIE_NAME`, `COOKIE_MAX_AGE`, `FRONTEND_URL`.
4. Create `.env` in the backend root and set `DATABASE_URL` to your connection string (used by Prisma CLI).
5. Run `npx prisma generate` to generate the Prisma client.
6. Run `npx prisma migrate dev` to apply migrations (creates all tables).
7. Run `npx prisma db seed` to populate demo data (users, restaurants, reservations).
8. Run `npm run dev` for both backend and frontend.

> **Personal note:** I use 4 terminals with appropriate names/colors — 2 for the dev servers and 2 for running commands, one pointing to each of the frontend and backend folders.
