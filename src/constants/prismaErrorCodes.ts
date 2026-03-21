// Prisma's documented error codes for known request errors (PrismaClientKnownRequestError).
// Add entries here only when a code is actually handled somewhere in the codebase.
export const PRISMA_ERROR_CODES = {
  // Returned by update/delete when the target record does not exist
  RECORD_NOT_FOUND: "P2025",
} as const;
