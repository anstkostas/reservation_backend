const ENV = process.env.NODE_ENV || "development";
require("dotenv").config({ path: `.env.${ENV}` });
const ms = require("ms");

const SERVER = {
  PORT: Number(process.env.PORT) || 22000,
}

const FRONTEND_SERVER = process.env.FRONTEND_URL ?? "http://localhost:5173";

// Support both DATABASE_URL (Render) and individual credentials (local)
const DB_CONFIG = process.env.DB_URL ? {
  URL: process.env.DB_URL,
} : {
  ENV: ENV,
  HOST: process.env.DB_HOST || "localhost",
  PORT: Number(process.env.DB_PORT) || 5432,
  NAME: process.env.DB_NAME || "reservation",
  USER: process.env.DB_USER || "postgres",
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
  SAME_SITE: ENV === "production" ? "none" : "lax",
  MAX_AGE: ms(AUTH_CONFIG.JWT_EXPIRES_IN || "2h"),
};

module.exports = {
  ENV,
  SERVER,
  FRONTEND_SERVER,
  DB_CONFIG,
  AUTH_CONFIG,
  COOKIE_CONFIG,
};
