import type { UserOutput } from "../dtos/userDTO.js";

declare global {
  namespace Express {
    interface Request {
      // Attached by requireAuth middleware after JWT verification
      user?: UserOutput;
    }
  }
}
