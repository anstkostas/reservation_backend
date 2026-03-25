// Business rules for reservations — enforced in the service layer.
// Documented in CLAUDE.md under Project-Specific Conventions.
export const RESERVATION_BOOKING_WINDOW_MONTHS = 2;

// A customer cannot have two active reservations within this many hours of each other.
// Accounts for travel time and a reasonable dining duration.
export const RESERVATION_BUFFER_HOURS = 4;
