import type { User } from "../generated/prisma/client.js";
import { userOutputDTO, type UserOutput } from "./userDTO.js";

export interface LoginOutput {
  user: UserOutput;
  token: string;
}

/**
 * Shapes the login/signup response — combines the safe user output with the signed token.
 *
 * @param {User} user - User record from the database
 * @param {string} token - Signed JWT
 * @returns {LoginOutput}
 */
export function loginOutputDTO(user: User, token: string): LoginOutput {
  return {
    user: userOutputDTO(user),
    token,
  };
}
