import type { Restaurant, RestaurantTranslation } from "../generated/prisma/index.js";

export interface RestaurantPrivateOutput {
  id: string;
  name: string;
  description: { en: string; el: string | null };
  address: string;
  phone: string;
  capacity: number;
  logoUrl: string;
  coverImageUrl: string;
  ownerId: string | null;
}

/**
 * Owner-facing ("private") shape of a Restaurant. Unlike restaurantOutputDTO, this EXPOSES
 * address + phone and returns description as BOTH locales ({ en, el }) so the owner edit form
 * can pre-fill each language input. EN is the canonical Restaurant.description; EL comes from the
 * restaurant_translations row (null when no EL translation exists).
 *
 * @param {Restaurant & { translations?: RestaurantTranslation[] }} restaurant - Restaurant joined with ALL its translations
 * @returns {RestaurantPrivateOutput}
 */
export function restaurantPrivateOutputDTO(
  restaurant: Restaurant & { translations?: RestaurantTranslation[] }
): RestaurantPrivateOutput {
  // "el" is the only non-canonical locale stored today; EN lives on the parent row
  const elTranslation = restaurant.translations?.find((t) => t.locale === "el");
  return {
    id: restaurant.id,
    name: restaurant.name,
    description: { en: restaurant.description, el: elTranslation?.description ?? null },
    address: restaurant.address,
    phone: restaurant.phone,
    capacity: restaurant.capacity,
    logoUrl: restaurant.logoUrl,
    coverImageUrl: restaurant.coverImageUrl,
    ownerId: restaurant.ownerId,
  };
}

export interface RestaurantOutput {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  capacity: number;
  logoUrl: string;
  coverImageUrl: string;
  ownerId: string | null;
}

/**
 * Shapes a Restaurant record for API output.
 * Exposes address and phone as public business contact info — customers see them on the detail page.
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
    address: restaurant.address,
    phone: restaurant.phone,
    capacity: restaurant.capacity,
    logoUrl: restaurant.logoUrl,
    coverImageUrl: restaurant.coverImageUrl,
    ownerId: restaurant.ownerId,
  };
}
