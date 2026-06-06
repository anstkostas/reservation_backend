import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type SupportedLocale } from "@/constants/index.js";

/**
 * Resolves the best supported locale from an `Accept-Language` header value.
 *
 * Walks the header's comma-separated language ranges in listed order (clients
 * send their highest-priority language first; q-weights are intentionally NOT
 * re-sorted — see note below), strips any region subtag (`el-GR` -> `el`), and
 * returns the first range whose base language is supported. Falls back to
 * {@link DEFAULT_LOCALE} when the header is missing, empty, or names no
 * supported language.
 *
 * Note: q-value ordering (`en;q=0.1,el;q=0.9`) is not honoured — listed order
 * is used for simplicity. The real clients (React i18n, Flutter) send a single
 * plain code (`en` / `el`), so this only affects raw browser hits to the API.
 *
 * @param {string | undefined} header - Raw `Accept-Language` header value.
 * @returns {SupportedLocale} A supported locale code; {@link DEFAULT_LOCALE} if none match.
 */
export function resolveLocale(header: string | undefined): SupportedLocale {
  if (!header) return DEFAULT_LOCALE;

  const supported: readonly string[] = SUPPORTED_LOCALES;
  for (const range of header.split(",")) {
    // "el-GR;q=0.9" -> "el"
    const base = range.split(";")[0]?.trim().split("-")[0]?.toLowerCase();
    if (base && supported.includes(base)) {
      return base as SupportedLocale;
    }
  }

  return DEFAULT_LOCALE;
}
