export function sanitize(str: string): string {
  if (!str) return "";
  // Strip out HTML tags, javascript:, data: URIs, etc.
  let clean = str.replace(/<[^>]*>?/gm, "");
  clean = clean.replace(/javascript:/gi, "");
  clean = clean.replace(/data:/gi, "");
  return clean.trim();
}

export function sanitizeField(str: string, maxLength: number): string {
  const sanitized = sanitize(str);
  return sanitized.substring(0, maxLength);
}
