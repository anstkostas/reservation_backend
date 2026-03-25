-- Rename persons → people (informational party size field on Reservations)
ALTER TABLE "Reservations" RENAME COLUMN "persons" TO "people";
