import swaggerJSDoc from "swagger-jsdoc";
import { SERVER } from "../config/env.js";

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
            success: {
              type: "boolean",
              example: true,
            },
            data: {
              $ref: "#/components/schemas/User",
            },
            message: {
              type: "string",
              example: "Logged in successfully",
            },
          },
          description:
            "Response returned after a successful login or signup. The JWT is set as an httpOnly cookie — it is not included in the response body.",
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
          description: "User object returned by the API. Password is excluded for security.",
        },
        Reservation: {
          // reservationOutputDTO
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            scheduledAt: {
              type: "string",
              format: "date-time",
              example: "2025-12-31T19:30:00.000Z",
            },
            people: {
              type: "integer",
              example: 2,
            },
            status: {
              type: "string",
              enum: ["active", "canceled", "completed", "no-show"],
            },
            restaurantId: {
              type: "string",
              format: "uuid",
            },
            restaurantName: {
              type: "string",
              nullable: true,
            },
            restaurantAddress: {
              type: "string",
              nullable: true,
            },
            restaurantPhone: {
              type: "string",
              nullable: true,
            },
            customerId: {
              type: "string",
              format: "uuid",
            },
            customer: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                firstname: { type: "string" },
                lastname: { type: "string" },
                email: { type: "string", format: "email" },
              },
            },
          },
          description:
            "Reservation object returned by the API. Includes joined restaurant and customer fields when available.",
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
            address: {
              type: "string",
            },
            phone: {
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
          required: ["email", "password", "firstname", "lastname", "role"],
          properties: {
            firstname: {
              type: "string",
              minLength: 4,
              maxLength: 50,
              example: "John",
            },
            lastname: {
              type: "string",
              minLength: 4,
              maxLength: 50,
              example: "Doe",
            },
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            password: {
              type: "string",
              format: "password",
              description:
                "Min 8 characters, must include uppercase, lowercase, number, and special character",
              example: "StrongPassword123!",
            },
            role: {
              type: "string",
              enum: ["customer", "owner"],
            },
            restaurantId: {
              type: "string",
              format: "uuid",
              nullable: true,
              description: "Required when role is 'owner' — the restaurant to claim",
              example: null,
            },
          },
          description:
            "Data required to create a new user account. For owners, restaurantId must reference an existing unowned restaurant.",
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
          required: ["scheduledAt"],
          properties: {
            scheduledAt: {
              type: "string",
              format: "date-time",
              example: "2025-12-31T19:30:00.000Z",
            },
            people: {
              type: "integer",
              default: 1,
              example: 2,
            },
          },
          additionalProperties: false,
          description:
            "Input data for creating a reservation. Requires a scheduledAt ISO datetime and an optional number of people. Status and customerId are assigned automatically.",
        },
        UpdateReservationInput: {
          type: "object",
          properties: {
            scheduledAt: {
              type: "string",
              format: "date-time",
              example: "2025-12-31T19:30:00.000Z",
            },
            people: {
              type: "integer",
              example: 2,
            },
          },
          additionalProperties: false,
          description:
            "Input fields for updating a reservation. Only 'scheduledAt' and 'people' can be updated. At least one field must be provided.",
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ["./src/routes/**/*.ts"],
});

export default swaggerSpec;
