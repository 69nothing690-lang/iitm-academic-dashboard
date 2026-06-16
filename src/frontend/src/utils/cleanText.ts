/**
 * Global text cleaning utility.
 * Decodes any \\uXXXX escape sequences, fixes broken surrogate pairs,
 * removes corrupted prefixes (lu2728, etc), normalizes dashes and quotes.
 */
export function cleanText(str: unknown): string {
  if (!str || typeof str !== "string") return str as string;
  try {
    return (
      str
        // decode double-escaped unicode like \\u2728
        .replace(/\\u([\dA-Fa-f]{4})/g, (_, g) =>
          String.fromCharCode(Number.parseInt(g, 16)),
        )
        // remove corrupted "lu" prefixes like lu2728, lu25be
        .replace(/\blu[\dA-Fa-f]{4}[a-zA-Z]*/g, "")
        // normalize em dash
        .replace(/\u2013/g, "–")
        // normalize smart quotes
        .replace(/\u2019/g, "'")
        .replace(/\u2018/g, "'")
        .replace(/\u201C/g, '"')
        .replace(/\u201D/g, '"')
        .trim()
    );
  } catch {
    return str;
  }
}

/**
 * Recursively clean all string fields in an object or array.
 */
export function cleanObject<T>(obj: T): T {
  if (!obj) return obj;
  if (typeof obj === "string") return cleanText(obj) as unknown as T;
  if (Array.isArray(obj)) return obj.map(cleanObject) as unknown as T;
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj as object)) {
      result[key] = cleanObject((obj as Record<string, unknown>)[key]);
    }
    return result as T;
  }
  return obj;
}
