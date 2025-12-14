import dotenv from "dotenv";

const env = process.env.NODE_ENV || "development";
dotenv.config({ path: `.env.${env}` });

export const DB_CONFIG = {
  ENV: env,
  HOST: process.env.DB_HOST || "localhost",
  PORT: process.env.DB_PORT || 1433,
  INSTANCE: process.env.DB_INSTANCE || undefined,
  NAME: process.env.DB_NAME || "RESERVATION",
  USER: process.env.DB_USER || "sa",
  PASSWORD: process.env.DB_PASSWORD,
};
