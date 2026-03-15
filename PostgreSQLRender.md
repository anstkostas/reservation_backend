# PostgreSQL Migration & Render Deployment Guide

This document outlines the configuration and deployment process for the PostgreSQL version of the Reservation App (Live on Render).

## Tech Stack (PostgreSQL Branch)
*   **Database**: [PostgreSQL](https://www.postgresql.org/)
*   **ORM**: [Sequelize](https://sequelize.org/) + [pg](https://www.npmjs.com/package/pg) (Driver)
*   **Deployment**: [Render](https://render.com/)

---

## Database Connection (PostgreSQL)

This project connects to a **PostgreSQL** database using **Sequelize**.

### How to Connect (Local Development)

1.  **Install PostgreSQL**: Download and install PostgreSQL (v14+) and pgAdmin 4.
2.  **Create Database**: Open pgAdmin 4 and create a database named `cf8-reservation` (or similar).
3.  **Authentication**: Use the default `postgres` user or create a dedicated user.

---

## Environment Variables AND Configuration

For the `postgresql` branch, use a `.env.development` file with these settings:

```env
# Server
PORT=
HOST=
FRONTEND_URL=

# PostgreSQL Configuration
DB_PORT=5432
DB_HOST=
DB_NAME=<db-name>
DB_USER=<postgres(is the default/master username)>
DB_PASSWORD=<your_password>

# Authentication
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=2h
COOKIE_NAME=
COOKIE_MAX_AGE=
```

---

## Migrations & Seed Data

1.  **Migrations**: Found in `/src/database/migrations`.
    *   **Run All**: `npx sequelize-cli db:migrate`
    *   **Undo All**: `npx sequelize-cli db:migrate:undo:all`

2.  **Seeders**: Found in `/src/database/seeders`.
    *   **Run All**: `npx sequelize-cli db:seed:all` (Populates demo users, restaurants, and reservations)
    *   **Undo All**: `npx sequelize-cli db:seed:undo:all`

---

## Deployment to Render

This project is configured for deployment on **Render**.

### 1. Database (PostgreSQL)
*   Create a new **PostgreSQL** database on Render.
*   **Note**: Copy the **Internal Database URL** after creation.

### 2. Backend Service
*   Create a **Web Service** on Render connected to this repository.
*   **Branch**: Select `postgresql` branch.
*   **Runtime**: Node
*   **Build Command**: `npm install`
*   **Start Command**: `npx sequelize-cli db:migrate:undo:all && npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all && npm start`
    *   *Note: This runs migrations(down, up)/seeders on every deploy.*
*   **Environment Variables**:
    *   `NODE_ENV`: `production`
    *   `DATABASE_URL`: (Paste your Internal Database URL here)
    *   `JWT_SECRET`:
    *   `JWT_EXPIRES_IN`: `2h`
    *   `COOKIE_NAME`: `accessToken`
    *   `FRONTEND_URL`:

### 3. Frontend Service (Static Site)
*   Create a **Static Site** on Render.
*   **Build Command**: `npm install && npm run build`
*   **Publish Directory**: `dist`
*   **Environment Variables**:
    *   `VITE_API_URL`:
    *    *Note: Append **/api** to the backend URL*

### 4. Connect to pgAdmin (Optional)
To manage your production database locally:

1.  **Go to pgAdmin**: Left panel, servers, right click -> register -> create server.
2.  **General Tab**: Give a name of your choice (e.g., "Render DB").
3.  **Get Credentials**: On Render, go to your Database Dashboard -> Connections -> **External Connection**.
4.  **Connection Tab**:
    *   **Host name/address**: The part of External Database URL after `@` up to `.render.com` (e.g. `dpg-xyz.frankfurt-postgres.render.com`).
    *   **Port**: `5432`
    *   **Maintenance database**: The name found in the 'Database' field on Render (e.g., `cf8_reservation`).
    *   **Username**: Value from 'Username' field on Render.
    *   **Password**: Value from 'Password' field on Render.
5.  **SSL Mode**: Go to **Parameters** (or SSL) tab and set to `Require` or `Read/Write`.
