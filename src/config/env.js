const ENV = process.env.NODE_ENV || "development";
require("dotenv").config({ path: `.env.${ENV}` });

const DB_CONFIG = {
  ENV: ENV,
  HOST: process.env.DB_HOST || "localhost",
  PORT: Number(process.env.DB_PORT) || 1433,
  INSTANCE: process.env.DB_INSTANCE || undefined,
  NAME: process.env.DB_NAME || "RESERVATION",
  USER: process.env.DB_USER,
  PASSWORD: process.env.DB_PASSWORD,
};

module.exports = { env: ENV, DB_CONFIG };
