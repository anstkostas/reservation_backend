import type {
  Reservation,
  Restaurant,
  User,
  ReservationStatus,
} from "../generated/prisma/index.js";

// Joined shape returned by the repository — restaurant and customer are optionally included
export type ReservationWithRelations = Reservation & {
  restaurant?: Pick<Restaurant, "name" | "address" | "phone"> | null;
  customer?: Pick<User, "id" | "firstname" | "lastname" | "email"> | null;
};

export interface ReservationOutput {
  id: string;
  scheduledAt: Date;
  persons: number;
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
    persons: reservation.persons,
    status: reservation.status,
    restaurantId: reservation.restaurantId,
    restaurantName: reservation.restaurant?.name,
    restaurantAddress: reservation.restaurant?.address,
    restaurantPhone: reservation.restaurant?.phone,
    customerId: reservation.customerId,
    customer: reservation.customer ?? null,
  };
}
