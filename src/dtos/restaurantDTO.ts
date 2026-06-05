import type { Restaurant, RestaurantTranslation } from "../generated/prisma/index.js";

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
 * `description` is localised: when a joined `translations` row for the requested
 * locale is present, its text wins; otherwise it falls back to the canonical
 * `description` column (English). Callers that don't join translations (e.g. the
 * unowned-restaurants list) always get the canonical value. `name` is always canonical.
 *
 * @param {Restaurant & { translations?: RestaurantTranslation[] }} restaurant - Restaurant, optionally joined with its locale translation
 * @returns {RestaurantOutput}
 */
export function restaurantOutputDTO(
  restaurant: Restaurant & { translations?: RestaurantTranslation[] }
): RestaurantOutput {
  return {
    id: restaurant.id,
    name: restaurant.name,
    description: restaurant.translations?.[0]?.description ?? restaurant.description,
    capacity: restaurant.capacity,
    logoUrl: restaurant.logoUrl,
    coverImageUrl: restaurant.coverImageUrl,
    ownerId: restaurant.ownerId,
  };
}
