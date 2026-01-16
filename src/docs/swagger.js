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
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
        },
      },
      schemas: {
        AuthResponse: {
          type: "object",
          properties: {
            user: {
              $ref: "#/components/schemas/User",
            },
          },
          description:
            "Response returned after a successful login or signup, containing user information.",
        },
        User: {
          // userOutputDTO
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            firstname: {
              type: "string",
            },
            lastname: {
              type: "string",
            },
            email: {
              type: "string",
              format: "email",
            },
            role: {
              type: "string",
              enum: ["customer", "owner"],
            },
          },
          description:
            "User object returned by the API. Password is excluded for security.",
        },
        Reservation: {
          // reservationOutputDTO
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            date: {
              type: "string",
              format: "date",
            },
            time: {
              type: "string",
              example: "19:30",
            },
            persons: {
              type: "integer",
              example: 2,
            },
            status: {
              type: "string",
              enum: ["active", "canceled", "completed"],
            },
            restaurantId: {
              type: "string",
              format: "uuid",
            },
            customerId: {
              type: "string",
              format: "uuid",
            },
          },
          description:
            "Reservation object returned by the API, including the customer and restaurant identifiers and the current status.",
        },
        Restaurant: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            name: {
              type: "string",
            },
            description: {
              type: "string",
            },
            capacity: {
              type: "integer",
            },
            logoUrl: {
              type: "string",
            },
            coverImageUrl: {
              type: "string",
            },
            ownerId: {
              type: "string",
              format: "uuid",
              nullable: true,
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Invalid or expired token",
            },
            details: {
              type: "object",
              nullable: true,
              description: "Optional error details",
            },
            stack: {
              type: "string",
              nullable: true,
              description: "Stack trace (development only)",
            },
          },
          description:
            "Standard error response returned for validation, authentication, authorization, or not found errors.",
        },
        SignupInput: {
          type: "object",
          required: ["email", "password"],
          properties: {
            firstname: {
              type: "string",
              example: "John",
            },
            lastname: {
              type: "string",
              example: "Doe",
            },
            email: {
              type: "string",
              example: "john@example.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "StrongPassword123!",
            },
            restaurantId: {
              type: "string",
              format: "uuid",
              nullable: true,
              example: null,
            },
          },
          description:
            "Data required to create a new user account. Email and password are mandatory; other fields are optional.",
        },
        LoginInput: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "StrongPassword123!",
            },
          },
          description:
            "Login credentials required to authenticate a user. Both fields are mandatory.",
        },
        CreateReservationInput: {
          type: "object",
          required: ["date", "time"],
          properties: {
            date: {
              type: "string",
              format: "date",
              example: "2025-12-31",
            },
            time: {
              type: "string",
              format: "time",
              example: "19:30",
            },
            persons: {
              type: "integer",
              default: 1,
              example: 2,
            },
          },
          additionalProperties: false,
          description:
            "Input data for creating a reservation. Includes date, time, and optional number of persons. Status and customerId are assigned automatically and should not be provided.",
        },
        UpdateReservationInput: {
          type: "object",
          properties: {
            date: {
              type: "string",
              format: "date",
              example: "2025-12-31",
            },
            time: {
              type: "string",
              format: "time",
              example: "19:30",
            },
            persons: {
              type: "integer",
              example: 2,
            },
          },
          additionalProperties: false,
          description:
            "Input fields for updating a reservation. Only 'date', 'time', and 'persons' can be updated. Status, restaurantId, and customerId are immutable.",
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ["./src/routes/**/*.js"],
});

module.exports = swaggerSpec;
