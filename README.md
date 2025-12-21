# RESERVATION SERVICE

## SQL Server Connection (Sequelize)

This project connects to a **Microsoft SQL Server** database using **Sequelize**.

### How to Connect

1. **SQL Server Authentication**  
   Connect using your SQL Server login and password. Ensure the **Trust Server Certificate** option is enabled.

2. **Enable Mixed Mode (if necessary)**  
   If your SQL Server only allows Windows Authentication, enable Mixed Authentication:

   - Connect with **Windows Authentication**.
   - In **Object Explorer**, right-click your SQL Server instance → **Properties**.
   - Select **Security** → enable **SQL Server and Windows Authentication mode**.
   - Right-click your SQL Server instance again → **Restart**.

3. **Create a Database**  
   Create the database that your Sequelize instance will connect to.

4. **Map User to Database**
   - In **Object Explorer**, expand **Security → Logins**.
   - Select your user/login, then go to **User Mapping**.
   - Select the database you just created.
   - Ensure **db_owner** is checked to grant full read/write/delete access.

---

## Environment Variables

Create a `.env` file with the following values:

| Variable      | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| `DB_HOST`     | SQL Server host                                             |
| `DB_PORT`     | TCP port for default instance (ignored for named instances) |
| `DB_INSTANCE` | Named instance (optional; leave empty for default)          |
| `DB_NAME`     | Database name                                               |
| `DB_USER`     | SQL Server Authentication username                          |
| `DB_PASSWORD` | SQL Server Authentication password                          |

---

> **Note:** Sequelize will create tables based on your models using `sequelize.sync()`, but the database itself must exist beforehand. Use **SQL Authentication** for portability across developers and environments.

## Migrations & Seed Data

Run `npx sequelize-cli db:migrate` to execute all migration files located in `/migrations` directory.
With `npx sequelize-cli db:migrate:undo:all` sequelize reverts all migration files. To execute a specific file run `npm sequelize-cli --to db:migrate <name-of-directory>`, add `:undo` for the oposite cmd.
Run `npx sequelize-cli db:seed:all` to executal all seed files located in `/seeders` directory.
With `npx sequelize-cli db:seed:undo:all` sequelize reverts all seed files. To execute a specific file run `npx sequelize-cli db:seed --seed <seed-filename.js>`.
For more information visit the [official site](https://sequelize.org/docs/v6/other-topics/migrations/).

## Repositories

1. Encapsulate all **database access** using Sequelize models. Serve as Data Access Objects(DAOs).
2. Implement **CRUD operations** for `User`, `Restaurant`, and `Reservation`.
3. Designed as **objects** with explicit methods: `create`, `update`, `findBy<field>`, `findAll`, `delete`, `count<byFK>`.

**Example: userRepository**

```js
module.exports = {
  async create(userData) {
    return User.create(userData);
  },
  async findById(id) {
    return User.findByPk(id);
  },
};
```

## Data Transfer Objects(DTOs)

Their purpose is to sanitize, normalize, and shape data going in and out of the system.

#### Input DTOs:

Clean incoming data (trim(), lowercase emails, defaults like status = "active"). Separate Create and Update DTOs for required vs optional fields.

#### Output DTOs:

Return only safe and necessary fields (exclude sensitive data like passwords).

#### Example: UserOutputDTO

```js
const UserOutputDTO = ({ id, email, firstName, lastName, role }) => ({
  id,
  email,
  firstName,
  lastName,
  role,
});
```

## Validation Schemas (Joi)

Used Joi to validate request data before passing to services.

Separate Create and Update schemas:

Create: strict, required fields

Update: optional fields, validate type if present

Enforce field formats, lengths etc.

Password strength (8+ chars, uppercase, lowercase, number, special char)


## Service Layer
Adds business logic.
For user model

#### 🏪 Restaurant Service
- Enforce ownership (restaurant belongs to an owner)
- - `ownerId` is injected by service (from auth context)
- Restaurant ownership cannot be reassigned via update
- Only owner can modify or delete their restaurant
- `ownerId` immutable after creation
  
#### 📅 ReservationService
- Implement soft delete
- Reservation data must be from today up to two months from now.
- persons must not be zero
- Guard from overbooking
- Status default to `active`
- Only reservation owner can update
- Only `active` reservations can be modified
- No updates to past reservations
- Immutable fields are protected:
  - `customerId`
  - `restaurantId`
##### Reservation Lifecycle
- `active` → `canceled`
- `active` → `completed`
