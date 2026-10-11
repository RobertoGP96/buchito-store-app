import { variantLabel, type AttributeDef, type AttributeValues } from "./attribute-schema";

/** Devuelve `base` si está libre; si no, `base-2`, `base-3`… hasta encontrar
 *  uno que no esté en `taken`. `taken` puede traer slugs ajenos al prefijo. */
export function nextAvailableSlug(base: string, taken: Iterable<string>): string {
  const used = taken instanceof Set ? taken : new Set(taken);
  if (!used.has(base)) return base;
  for (let suffix = 2; ; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
}

/** Nombre explícito si lo hay; si no, "Negro / M" a partir de los atributos de
 *  variante; null cuando no hay nada que mostrar (producto de variante única). */
export function resolveVariantName(
  explicit: string | null,
  schema: AttributeDef[],
  attributes: AttributeValues
): string | null {
  if (explicit) return explicit;
  const label = variantLabel(schema, attributes);
  return label === "" ? null : label;
}

/** La primera variante de un producto siempre es la predeterminada. */
export function resolveIsDefault(requested: boolean, existingVariantCount: number): boolean {
  return existingVariantCount === 0 || requested;
}

/** Primer error de `validateAttributes`, que ya nombra el atributo
 *  ("Talla es obligatorio"). */
export function firstAttributeError(errors: Record<string, string>): string | null {
  return Object.values(errors)[0] ?? null;
}
