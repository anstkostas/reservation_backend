import type { UserOutput } from "./userDTO.js";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface LoginServiceOutput {
  user: UserOutput;
  tokens: AuthTokens;
}
