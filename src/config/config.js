import { ENV, USER, PASSWORD, NAME, HOST, PORT } from "../env.js";
// Sequelize-cli reads the ENV and selects from the list.
export default {
  development: {
    username: USER,
    password: PASSWORD,
    database: NAME,
    host: HOST,
    port: PORT,
    dialect: "mssql",
  },
  test: {
    username: USER,
    password: PASSWORD,
    database: `${NAME}_test`,
    host: HOST,
    port: PORT,
    dialect: "mssql",
  },
  production: {
    username: USER,
    password: PASSWORD,
    database: NAME,
    host: HOST,
    port: PORT,
    dialect: "mssql",
  },
};
