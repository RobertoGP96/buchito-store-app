const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

/** "Camisa Básica Hombre" → "camisa-basica-hombre". */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
