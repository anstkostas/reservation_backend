import type { User, Role } from "../generated/prisma/client.js";

export interface UserOutput {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: Role;
}

/**
 * Shapes a User record for safe API output — strips the password field.
 *
 * @param {User} user - User record from the database
 * @returns {UserOutput} Safe user object with no sensitive fields
 */
export function userOutputDTO(user: User): UserOutput {
  return {
    id: user.id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    role: user.role,
  };
}
