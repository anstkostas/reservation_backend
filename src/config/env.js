const ENV = process.env.NODE_ENV || "development";
require("dotenv").config({ path: `.env.${ENV}` });

const SERVER = {
  PORT: Number(process.env.PORT) || 3000,
};

const DB_CONFIG = {
  ENV: ENV,
  HOST: process.env.DB_HOST || "localhost",
  PORT: Number(process.env.DB_PORT) || 1433,
  INSTANCE: process.env.DB_INSTANCE || undefined,
  NAME: process.env.DB_NAME || "RESERVATION",
  USER: process.env.DB_USER,
  PASSWORD: process.env.DB_PASSWORD,
};

const AUTH_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "2h",
};

module.exports = { ENV, SERVER, DB_CONFIG, AUTH_CONFIG };
