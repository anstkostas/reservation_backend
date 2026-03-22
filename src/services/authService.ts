import jwt from "jsonwebtoken";
import type ms from "ms";
import bcrypt from "bcryptjs";
import { userRepository } from "../repositories/index.js";
import { ValidationError } from "../errors/index.js";
import { AUTH_CONFIG } from "../config/env.js";
import { loginOutputDTO, type LoginOutput } from "../dtos/index.js";
import type { LoginInput, CreateUserInput } from "../validation/index.js";
import { userService } from "./userService.js";

export const authService = {
  /**
   * Authenticates a user and returns a signed JWT alongside the user output DTO.
   *
   * @param {LoginInput} data - Validated login credentials
   * @returns {Promise<LoginOutput>} Login output DTO with user and token
   * @throws {ValidationError} If email is not found or password does not match
   */
  async login(data: LoginInput): Promise<LoginOutput> {
    const { email, password } = data;

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError("Invalid email or password");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new ValidationError("Invalid email or password");
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      AUTH_CONFIG.JWT_SECRET,
      { expiresIn: AUTH_CONFIG.JWT_EXPIRES_IN as ms.StringValue }
    );

    return loginOutputDTO(user, token);
  },

  /**
   * Signs up a new user and returns a signed JWT alongside the user output DTO.
   *
   * @param {CreateUserInput} data - Validated signup data
   * @returns {Promise<LoginOutput>} Login output DTO with the newly created user and token
   * @throws {ValidationError} If email is taken or owner business rules are violated — bubbled from userService.createUser
   * @throws {NotFoundError} If the claimed restaurant does not exist — bubbled from userService.createUser
   */
  async signup(data: CreateUserInput): Promise<LoginOutput> {
    const user = await userService.createUser(data);

    const token = jwt.sign(
      { id: user.id, role: user.role },
      AUTH_CONFIG.JWT_SECRET,
      { expiresIn: AUTH_CONFIG.JWT_EXPIRES_IN as ms.StringValue }
    );

    // userService.createUser returns UserOutput (password already stripped),
    // so we return the shape directly instead of passing through loginOutputDTO
    // which expects a full User record
    return { user, token };
  },
};
