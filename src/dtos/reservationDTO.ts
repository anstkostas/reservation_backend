import type {
  Reservation,
  Restaurant,
  User,
} from "../generated/prisma/index.js";

/**
 * API-facing reservation status.
 * Uses "no-show" (hyphen) instead of Prisma's internal "no_show" (underscore).
 * The @map("no-show") in the Prisma schema only affects DB storage — the TS
 * runtime value remains "no_show", so the DTO is responsible for the mapping.
 */
export type ReservationStatus = "active" | "canceled" | "completed" | "no-show";

// Joined shape returned by the repository — restaurant and customer are optionally included
export type ReservationWithRelations = Reservation & {
  restaurant?: Pick<Restaurant, "name" | "address" | "phone"> | null;
  customer?: Pick<User, "id" | "firstname" | "lastname" | "email"> | null;
};

/**
 * Safe API output shape for a reservation.
 * Flattens joined relations (restaurant name/address/phone, customer) into top-level fields.
 */
export interface ReservationOutput {
  id: string;
  scheduledAt: Date;
  people: number;
  status: ReservationStatus;
  restaurantId: string;
  restaurantName: string | undefined;
  restaurantAddress: string | undefined;
  restaurantPhone: string | undefined;
  customerId: string;
  customer: Pick<User, "id" | "firstname" | "lastname" | "email"> | null;
}

/**
 * Shapes a Reservation record (with optional joined relations) for API output.
 *
 * @param {ReservationWithRelations} reservation - Reservation with optional restaurant and customer joins
 * @returns {ReservationOutput}
 */
export function reservationOutputDTO(reservation: ReservationWithRelations): ReservationOutput {
  return {
    id: reservation.id,
    scheduledAt: reservation.scheduledAt,
    people: reservation.people,
    status: reservation.status === "no_show" ? "no-show" : reservation.status,
    restaurantId: reservation.restaurantId,
    restaurantName: reservation.restaurant?.name,
    restaurantAddress: reservation.restaurant?.address,
    restaurantPhone: reservation.restaurant?.phone,
    customerId: reservation.customerId,
    customer: reservation.customer ?? null,
  };
}
