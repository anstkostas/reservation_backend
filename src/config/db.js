import { Sequelize } from "sequelize";
import { ENV, DB_CONFIG } from "./env.js";
import config from "./config.js";

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

async function checkAuthMode() {
  try {
    await sequelize.authenticate();
    console.log("Connected to MSSQL");

    const [results] = await sequelize.query(
      `SELECT SERVERPROPERTY('IsIntegratedSecurityOnly') AS IsWindowsAuthOnly`
    );

    if (results[0].IsWindowsAuthOnly === 1) {
      console.log("SQL Server is Windows Authentication only.");
    } else {
      console.log(
        "SQL Server is in Mixed Mode (Windows + SQL Authentication)."
      );
    }
  } catch (err) {
    console.error("Connection failed:", err);
  }
}

checkAuthMode();
