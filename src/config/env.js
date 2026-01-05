const ENV = process.env.NODE_ENV || "development";
require("dotenv").config({ path: `.env.${ENV}` });
const ms = require("ms");

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

const COOKIE_CONFIG = {
  NAME: process.env.COOKIE_NAME || "accessToken",
  HTTP_ONLY: true,
  SECURE: ENV === "production",
  SAME_SITE: ENV === "production" ? "strict" : "lax",
  MAX_AGE: ms(AUTH_CONFIG.JWT_EXPIRES_IN || "2h"),
};

module.exports = { ENV, SERVER, DB_CONFIG, AUTH_CONFIG, COOKIE_CONFIG };
