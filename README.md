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

| Variable      | Description                                         |
|---------------|-----------------------------------------------------|
| `DB_HOST`     | SQL Server host                                     |
| `DB_PORT`     | TCP port for default instance (ignored for named instances) |
| `DB_INSTANCE` | Named instance (optional; leave empty for default) |
| `DB_NAME`     | Database name                                      |
| `DB_USER`     | SQL Server Authentication username                |
| `DB_PASSWORD` | SQL Server Authentication password                |

---

> **Note:** Sequelize will create tables based on your models using `sequelize.sync()`, but the database itself must exist beforehand. Use **SQL Authentication** for portability across developers and environments.
