const env = process.env.NODE_ENV || "development";
require("dotenv").config({ path: `.env.${env}` });

const DB_CONFIG = {
  ENV: env,
  HOST: process.env.DB_HOST || "localhost",
  PORT: Number(process.env.DB_PORT) || 1433,
  INSTANCE: process.env.DB_INSTANCE || undefined,
  NAME: process.env.DB_NAME || "RESERVATION",
  USER: process.env.DB_USER,
  PASSWORD: process.env.DB_PASSWORD,
};

module.exports = DB_CONFIG;