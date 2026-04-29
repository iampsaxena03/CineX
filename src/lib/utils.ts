/**
 * Safely generates an SEO-friendly URL slug from an ID and title.
 * e.g., generateSlug(155, "The Dark Knight") => "155-the-dark-knight"
 */
export function generateSlug(id: string | number, title?: string | null): string {
  if (!title) return String(id);
  const formattedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/(^-|-$)+/g, ''); // Remove trailing or leading hyphens
  return `${id}-${formattedTitle}`;
}
