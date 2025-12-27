const swaggerJSDoc = require("swagger-jsdoc");
const { SERVER } = require("../config/env.js");

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Restaurant Reservation API",
      version: "1.0.0",
      description: "Backend API for a role-based restaurant reservation system",
    },
    servers: [
      {
        url: `http://localhost:${SERVER.PORT}/api`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        AuthResponse: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description: "JWT access token",
            },
            user: {
              type: "object",
              properties: {
                id: {
                  type: "integer",
                },
                email: {
                  type: "string",
                },
                role: {
                  type: "string",
                  example: "customer",
                },
              },
            },
          },
        },

        ErrorResponse: {
          type: "object",
          properties: {
            status: {
              type: "string",
              example: "error",
            },
            message: {
              type: "string",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/**/*.js"],
});

module.exports = swaggerSpec;
