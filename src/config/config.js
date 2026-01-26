const { DB_CONFIG } = require("./env.js");

// Support DATABASE_URL for production (Render)
if (DB_CONFIG.URL) {
  module.exports = {
    development: {
      use_env_variable: "DB_URL",
      dialect: "postgres",
    },
    production: {
      use_env_variable: "DB_URL",
      dialect: "postgres",
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    },
  };
} else {
  // Local development with individual credentials
  module.exports = {
    development: {
      username: DB_CONFIG.USER,
      password: DB_CONFIG.PASSWORD,
      database: DB_CONFIG.NAME,
      host: DB_CONFIG.HOST,
      port: DB_CONFIG.PORT,
      dialect: "postgres",
    },
    test: {
      username: DB_CONFIG.USER,
      password: DB_CONFIG.PASSWORD,
      database: `${DB_CONFIG.NAME}_test`,
      host: DB_CONFIG.HOST,
      port: DB_CONFIG.PORT,
      dialect: "postgres",
    },
    production: {
      username: DB_CONFIG.USER,
      password: DB_CONFIG.PASSWORD,
      database: DB_CONFIG.NAME,
      host: DB_CONFIG.HOST,
      port: DB_CONFIG.PORT,
      dialect: "postgres",
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    },
  };
}
