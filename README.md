# Reservation App - Backend Service

A robust, secure REST API service built with **Express.js** and **SQL Server**. It powers the reservation platform by handling authentication, reservations, restaurant management.

> **TIP**  
> Want to get up and running quickly? Jump to the [Quick connect](#quick-connect) section at the end of this document.

## Table of Contents
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [SQL Server Connection (Sequelize)](#sql-server-connection-sequelize)
- [Environment Variables AND Configuration](#environment-variables-and-configuration)
- [Migrations & Seed Data](#migrations--seed-data)
- [Project Structure & Patterns](#project-structure--patterns)
- [Service Layer with Business Logic](#service-layer-with-business-logic)
- [Database Models](#database-models)
- [API Routes Overview](#api-routes-overview)
- [Error Handling](#error-handling)
- [Running the Server](#running-the-server)
- [Quick connect](#quick-connect)

## Tech Stack
*   **Core**: [Node.js](https://nodejs.org/) + [Express.js](https://expressjs.com/)
*   **Database**: [MSSQL](https://www.npmjs.com/package/mssql)
*   **ORM**: [Sequelize](https://sequelize.org/) + [Tedious](https://www.npmjs.com/package/tedious) (Driver)
*   **Authentication**: [JWT](https://www.npmjs.com/package/jsonwebtoken) + HttpOnly Cookies
*   **Security**: [Bcryptjs](https://www.npmjs.com/package/bcryptjs) (Hashing) + [Cors](https://www.npmjs.com/package/cors)
*   **Validation**: [Joi](https://joi.dev/)
*   **Utilities**: [Dotenv](https://www.npmjs.com/package/dotenv) + [UUID](https://www.npmjs.com/package/uuid)
*   **Documentation**: [Swagger](https://swagger.io/) + [Swagger UI](https://swagger.io/swagger-ui/)
*   **Development Environment**:
    *   **IDE**: [VS Code](https://code.visualstudio.com/) + [Antigravity](https://antigravity.google/)
    *   **AI Assistants**: [Gemini 3 Pro](https://gemini.google.com/), [GitHub Copilot](https://github.com/features/copilot), [ChatGPT 5](https://chatgpt.com/)


## Architecture
The application follows the **MVC (Model-View-Controller)** pattern with a Service layer:

1.  **Routes** (`src/routes`): Defines endpoints and applies middleware (Auth, Validation).
2.  **Controllers** (`src/controllers`): Handles HTTP Request/Response, parses input, and calls Services.
3.  **Services** (`src/services`): Contains **Business Logic**. Handles transactions, complex validations (e.g., "Is table available?"), and repository calls.
4.  **Repositories** (Implicit in Sequelize Models): Direct database interaction via Sequelize models acting as Data Access Objects (DAOs).

---

## SQL Server Connection (Sequelize)

This project connects to a **Microsoft SQL Server** database using **Sequelize**.

### How to Connect

1.  **SQL Server Authentication**  
    Connect using your SQL Server login and password. Ensure the **Trust Server Certificate** option is enabled.

2.  **Enable Mixed Mode (if necessary)**  
    If your SQL Server only allows Windows Authentication, enable Mixed Authentication:
    *   Connect with **Windows Authentication**.
    *   In **Object Explorer**, right-click your SQL Server instance → **Properties**.
    *   Select **Security** → enable **SQL Server and Windows Authentication mode**.
    *   Right-click your SQL Server instance again → **Restart**.

3.  **Create a Database**  
    Create the database that your Sequelize instance will connect to (e.g., `RESERVATION`).

4.  **Map User to Database**
    *   In **Object Explorer**, expand **Security → Logins**.
    *   Select your user/login, then go to **User Mapping**.
    *   Select the database you just created.
    *   Ensure **db_owner** is checked to grant full read/write/delete access.

---

## Environment Variables AND Configuration

Create a `.env.development` file in the root directory:

```env
# Server
PORT=

# Database Connection
DB_PORT=
DB_INSTANCE=
DB_HOST=
DB_NAME=
DB_USER=
DB_PASSWORD=

# Authentication
JWT_SECRET=
JWT_EXPIRES_IN=
COOKIE_NAME=
COOKIE_MAX_AGE=
```

> **Note**: Sequelize syncs models using `sequelize.sync()`, but the database itself must exist beforehand.

---

## Migrations & Seed Data

This project uses **Sequelize CLI** to manage the database schema.

1.  **Migrations**: Found in `/src/database/migrations`.
    *   **Run All**: `npx sequelize-cli db:migrate`
    *   **Undo All**: `npx sequelize-cli db:migrate:undo:all`
    *   **Undo Last**: `npx sequelize-cli db:migrate:undo`

2.  **Seeders**: Found in `/src/database/seeders`.
    *   **Run All**: `npx sequelize-cli db:seed:all` (Populates demo users, restaurants, and reservations)
    *   **Undo All**: `npx sequelize-cli db:seed:undo:all`

For more information visit the [official Sequelize Migrations docs](https://sequelize.org/docs/v6/other-topics/migrations/).

---

## Project Structure & Patterns

### Directory Structure implementation
Implemented an **index.js policy**. Sub-directories (like `models`, `routes`) identify their exports in an `index.js`.
*   **Usage**: To import modules from a directory, requiring the directory path is sufficient as Node.js automatically looks for `index.js`.
*   **Note**: Do not name a file the same as its parent folder to avoid import confusion.

### Repositories (Data Access Layer)
*   Encapsulate all **database access** using Sequelize models.
*   Implement **CRUD operations** for `User`, `Restaurant`, and `Reservation`.
*   Designed as **objects** with explicit methods: `create`, `update`, `findByPk`, `findAll`, `destroy`.

**Example: userRepository**
```js
module.exports = {
  async create(userData) {
    return User.create(userData);
  },
  async findById(id) {
    return User.findByPk(id);
  }
};
```

### Data Transfer Objects (DTOs)
Purpose: To sanitize, normalize, and shape data going in and out of the system.

*   **Input DTOs**: Clean incoming data (trim, lowercase emails, set defaults). Separate DTOs exist for Create vs Update (e.g., Update allows optional fields).
*   **Output DTOs**: Return only safe fields (excluding passwords).

**Example: UserOutputDTO**
```js
const UserOutputDTO = (user) => ({
  id, email, firstname, lastname, role
});
```

### Validation (Joi)
Joi schemas validate request data before it reaches the Service layer.
*   **Strict Mode**: Used for Creation (all required fields must be present).
*   **Password Rules**: Enforces 8+ chars, uppercase, lowercase, number, special char.

---

## Service Layer with Business Logic

### 🔐 Auth Service (`authService.js`)
Handles user authentication and JWT generation.
*   **Login**:
    *   **Guards**: Validates email existence and password match (Bcrypt).
    *   **Output**: Returns `UserOutputDTO` + `accessToken`.
*   **Signup** (Delegates to UserService):
    *   **Output**: Returns `UserOutputDTO` + `accessToken`.

### 👤 User Service (`userService.js`)
Manages user creation and restaurant claiming.
*   **Create User (Transactional)**:
    *   **Guards**:
        *   Checks email uniqueness.
        *   **Role Logic**: If `restaurantId` is provided, role maps to `owner`; otherwise `customer`.
        *   **Owner Guard**: If role is `owner`, ensures `restaurantId` is present and restaurant is currently **unowned**.
    *   **Side Effect**: Assigns the user as the owner of the selected restaurant.
*   **List Unowned**: Filters all restaurants to find those with `ownerId: null`.

### 🏪 Restaurant Service (`restaurantService.js`)
Read-only access to restaurant data (Create/Update handled via seeders or manual DB access for now).
*   **Get All / Get By ID**: Returns sanitised `RestaurantOutputDTO` (excludes internal fields if any).
*   **Guards**: Throws `NotFoundError` if ID doesn't exist.

### 📅 Reservation Service (`reservationService.js`)
The core transactional engine of the application.

#### 1. Create Reservation (`createReservation`)
*   **Transactional**: Yes.
*   **Guards**:
    *   **Role**: Only `customer` role can create.
    *   **Date/Time**: Must be future-dated (up to 2 months).
    *   **Overbooking**: Checks `countActiveBySlot` vs `restaurant.capacity`. Atomically locks the restaurant row to prevent race conditions during high load.
*   **Defaults**: Status set to `active`.

#### 2. Update Reservation (`updateReservation`)
*   **Transactional**: Yes (if date/time modifications).
*   **Guards**:
    *   **Ownership**: Users can only modify *their own* reservations.
    *   **State**: Only `active` reservations can be modified (completed/canceled are immutable).
    *   **Immutability**: Cannot change `customerId` or `restaurantId`.
    *   **Re-Validation**: If moving to a new slot, re-runs Overbooking check excluding the current reservation.

#### 3. Cancel Reservation (`cancelReservation`)
*   **Guards**:
    *   Only `active` status can be canceled.
    *   Only the `customer` who made it can cancel.
*   **Logic**: Soft-delete (updates status to `canceled`).

#### 4. Resolve Reservation (`resolveReservation`)
*   **Role**: **Owner Only**.
*   **Guards**:
    *   Owner must own the restaurant associated with the reservation.
    *   Status transition must be to `completed` or `no-show`.
    *   Target reservation must be `active`.

## Database Models

### 1. User (`Users`)
Represents a platform user, either a customer looking for food or an owner managing a restaurant.
*   **Fields**:
    *   `id` (UUID, Primary Key)
    *   `firstname` (String, Required)
    *   `lastname` (String, Required)
    *   `email` (String, Unique, Required) - Login identifier.
    *   `password` (String, Required) - Bcrypt hashed.
    *   `role` (Enum: `customer` | `owner`, Required)
*   **Associations**:
    *   `hasOne` **Restaurant** (as `restaurants`, foreignKey: `ownerId`)
    *   `hasMany` **Reservation** (as `reservations`, foreignKey: `customerId`)

### 2. Restaurant (`Restaurants`)
Represents a dining venue. One-to-one relationship with an Owner.
*   **Fields**:
    *   `id` (UUID, Primary Key)
    *   `name` (String, Required)
    *   `description` (Text)
    *   `address` (String, Required)
    *   `phone` (String, Required)
    *   `capacity` (Integer, Required) - Maximum tables.
    *   `logoUrl` (String) - URL to logo image.
    *   `coverImageUrl` (String) - URL to cover image.
    *   `ownerId` (UUID, Unique) - Links to User.
*   **Associations**:
    *   `belongsTo` **User** (as `owner`, foreignKey: `ownerId`)
    *   `hasMany` **Reservation** (as `reservations`, foreignKey: `restaurantId`)

### 3. Reservation (`Reservations`)
A booking made by a customer at a restaurant.
*   **Fields**:
    *   `id` (UUID, Primary Key)
    *   `date` (DateOnly, Required) - YYYY-MM-DD.
    *   `time` (Time, Required) - HH:MM:SS.
    *   `persons` (Integer, Default: 1) - Number of people.
    *   `status` (Enum: `active` | `canceled` | `completed` | `no-show`, Default: `active`)
    *   `restaurantId` (UUID, Required)
    *   `customerId` (UUID, Required)
*   **Associations**:
    *   `belongsTo` **Restaurant** (as `restaurant`, foreignKey: `restaurantId`)
    *   `belongsTo` **User** (as `customer`, foreignKey: `customerId`)

---

## API Routes Overview

### Auth (`/api/auth`)
*   `POST /signup`: Register as Customer or Owner (sets HttpOnly cookie).
*   `POST /login`: Authenticates user and sets **HttpOnly Cookie**.
*   `POST /logout`: Clears the cookie.
*   `GET /me`: Returns the currently authenticated user context.

### Reservations (`/api/reservations`)
*   `GET /my-reservations`: List currently logged-in customer's reservations.
*   `POST /restaurants/:restaurantId`: Create a new booking (Transactional).
*   `PUT /:id`: Update reservation (Customer only).
*   `DELETE /:id`: Cancel a reservation (Customer only).
*   `GET /owner-reservations`: (Owner Only) List all bookings for their venue.
*   `POST /:id/resolve`: (Owner Only) Mark reservation as 'completed' or 'no-show'.

### Restaurants (`/api/restaurants`)
*   `GET /`: Public list of all restaurants.
*   `GET /:id`: Public details of a specific restaurant.

---

## Error Handling
The backend uses a centralized error handler (`globalErrorHandler.js` / middleware).
*   **Response Format**: `{ success: false, message: "Error...", data: null }`
*   **Operational Errors**: (e.g., "Table not available") return specific 400/404 messages.
*   **System Errors**: Returns generic 500 error (Stack trace included in development).

## Running the Server
```bash
# Install dependencies
npm install

# Run (Development with Nodemon)
npm run dev
# Server default: http://localhost:22000
```

## Quick connect
1. `npm install` for both frontend and backend.
2. Create the database assigning a user to it.
3. Open `src/config/env.js` to see which env variables dont have defaults
4. Fill `.env` files on both frontend and backend.
5. Run `npx sequelize-cli db:migrate` & then `npx sequelize-cli db:seed:all` to get all tables with sample data.
6. Run `npm run dev` for both backend and frontend to start the servers.
7. Personal note: I open 4 different terminals(with appropriate names/colors) 2 for the servers and another 2 for executing commands each pointing to frontend and backend folders.
