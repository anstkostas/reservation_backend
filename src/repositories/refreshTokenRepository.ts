import bcrypt from "bcryptjs";
import { prisma } from "../config/prismaClient.js";
import { SALT_ROUNDS } from "../constants/index.js";

export const refreshTokenRepository = {
  /**
   * Persists a new refresh token record, storing only a bcrypt hash of the raw token.
   *
   * @param {string} rawToken - The plaintext refresh token (from JWT signing)
   * @param {string} userId - Owner of this token
   * @param {string} familyId - Family group UUID (all rotated tokens share the same familyId)
   * @param {Date} expiresAt - Expiry timestamp
   * @returns {Promise<void>}
   */
  async create(rawToken: string, userId: string, familyId: string, expiresAt: Date): Promise<void> {
    const tokenHash = await bcrypt.hash(rawToken, SALT_ROUNDS);
    await prisma.refreshToken.create({
      data: { tokenHash, userId, familyId, expiresAt },
    });
  },

  /**
   * Finds a refresh token record by scanning all rows with bcrypt comparison.
   * Used for both normal rotation and reuse detection (expired tokens must also be findable).
   *
   * NOTE: O(n) bcrypt scan — acceptable at this scale.
   * TODO: add SHA-256 index lookup for large-scale deployments.
   *
   * @param {string} rawToken - The plaintext refresh token
   * @returns {Promise<{ id: string; userId: string; familyId: string; expiresAt: Date } | null>}
   */
  async findByRawToken(rawToken: string): Promise<{ id: string; userId: string; familyId: string; expiresAt: Date } | null> {
    const all = await prisma.refreshToken.findMany({
      select: { id: true, tokenHash: true, userId: true, familyId: true, expiresAt: true },
    });

    for (const record of all) {
      const matches = await bcrypt.compare(rawToken, record.tokenHash);
      if (matches) {
        return { id: record.id, userId: record.userId, familyId: record.familyId, expiresAt: record.expiresAt };
      }
    }
    return null;
  },

  /**
   * Deletes a single refresh token by its primary key.
   * Called during token rotation to invalidate the consumed token.
   *
   * @param {string} id - RefreshToken UUID
   * @returns {Promise<void>}
   */
  async deleteById(id: string): Promise<void> {
    await prisma.refreshToken.delete({ where: { id } });
  },

  /**
   * Deletes all refresh tokens belonging to the same family.
   * Called when reuse is detected — invalidates the entire login session.
   *
   * @param {string} familyId - Family group UUID
   * @returns {Promise<void>}
   */
  async deleteByFamily(familyId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { familyId } });
  },

  /**
   * Deletes all refresh tokens for a given user.
   * Called on explicit logout to invalidate all active sessions.
   *
   * @param {string} userId - User UUID
   * @returns {Promise<void>}
   */
  async deleteAllForUser(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  },

  /**
   * Deletes all refresh tokens whose expiresAt is in the past.
   * Optional maintenance — call from a cron job or startup hook.
   *
   * @returns {Promise<number>} Count of deleted rows
   */
  async pruneExpired(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  },
};
