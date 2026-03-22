import type { Restaurant } from "../generated/prisma/index.js";

export interface RestaurantOutput {
  id: string;
  name: string;
  description: string;
  capacity: number;
  logoUrl: string;
  coverImageUrl: string;
  ownerId: string | null;
}

/**
 * Shapes a Restaurant record for API output.
 * Intentionally omits address and phone — the frontend does not use either field.
 *
 * @param {Restaurant} restaurant - Restaurant record from the database
 * @returns {RestaurantOutput}
 */
export function restaurantOutputDTO(restaurant: Restaurant): RestaurantOutput {
  return {
    id: restaurant.id,
    name: restaurant.name,
    description: restaurant.description,
    capacity: restaurant.capacity,
    logoUrl: restaurant.logoUrl,
    coverImageUrl: restaurant.coverImageUrl,
    ownerId: restaurant.ownerId,
  };
}
