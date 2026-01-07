const app = require("./app.js");
const { sequelize } = require("./models");
const { SERVER } = require("./config/env.js");

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Database connected");

    app.listen(SERVER.PORT, () => {
      console.log(`Server running on port ${SERVER.PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
