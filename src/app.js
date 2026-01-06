const express = require("express");
const cors = require("cors");
const { FRONTEND_SERVER } = require("./config/env.js");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");
const { registerRoutes } = require("./routes");
const { globalErrorHandler } = require("./utils/");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: FRONTEND_SERVER,
    credentials: true,
  })
);

registerRoutes(app);

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(globalErrorHandler);

module.exports = app;
