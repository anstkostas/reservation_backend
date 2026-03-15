const { DB_CONFIG } = require("./env.js");

// Sequelize-cli reads the ENV and selects from the list.
module.exports = {
  development: {
    username: DB_CONFIG.USER,
    password: DB_CONFIG.PASSWORD,
    database: DB_CONFIG.NAME,
    host: DB_CONFIG.HOST,
    port: DB_CONFIG.PORT,
    dialect: "mssql",
  },
  test: {
    username: DB_CONFIG.USER,
    password: DB_CONFIG.PASSWORD,
    database: `${DB_CONFIG.NAME}_test`,
    host: DB_CONFIG.HOST,
    port: DB_CONFIG.PORT,
    dialect: "mssql",
  },
  production: {
    username: DB_CONFIG.USER,
    password: DB_CONFIG.PASSWORD,
    database: DB_CONFIG.NAME,
    host: DB_CONFIG.HOST,
    port: DB_CONFIG.PORT,
    dialect: "mssql",
  },
};
