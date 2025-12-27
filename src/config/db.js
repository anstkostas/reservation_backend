const { Sequelize } = require("sequelize");
const { ENV, DB_CONFIG } = require("./env.js");
const config = require("./config.js");

const sequelize = new Sequelize(
  config[ENV].database,
  config[ENV].username,
  config[ENV].password,
  {
    port: config[ENV].port,
    host: config[ENV].host,
    dialect: "mssql",
    dialectOptions: {
      options: {
        instanceName: DB_CONFIG.INSTANCE,
        trustServerCertificate: true,
      },
    },
    // logging: Add winston logger here?
  }
);

module.exports = sequelize;
