const { Sequelize } = require("sequelize");
const { ENV, DB_CONFIG } = require("./env.js");
const config = require("./config.js");

let sequelize;

// Use DATABASE_URL if available (Render production)
if (DB_CONFIG.URL) {
  sequelize = new Sequelize(DB_CONFIG.URL, {
    dialect: "postgres",
    dialectOptions: {
      ssl: ENV === "production" ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    logging: false,
  });
} else {
  // Use individual credentials (local development)
  sequelize = new Sequelize(
    config[ENV].database,
    config[ENV].username,
    config[ENV].password,
    {
      port: config[ENV].port,
      host: config[ENV].host,
      dialect: "postgres",
      logging: false,
    }
  );
}

module.exports = sequelize;
