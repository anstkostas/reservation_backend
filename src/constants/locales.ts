/**
 * Locales the API supports for content localisation.
 *
 * Single source of truth for the language codes the backend recognises in the
 * `Accept-Language` header and persists in `restaurant_translations.locale`.
 * Kept as an `as const` tuple (not an enum) so the set is both an iterable
 * runtime list and a string-literal union — values match raw header strings
 * and the Prisma `String` locale column directly, with no `.value` unwrapping.
 */
export const SUPPORTED_LOCALES = ["en", "el"] as const;

/** A language code the API supports — `"en" | "el"`. */
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** Locale used when none of the requested locales is supported. English is canonical. */
export const DEFAULT_LOCALE: SupportedLocale = "en";
