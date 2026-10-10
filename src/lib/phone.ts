/** Solo dígitos, sin prefijo "+" ni separadores: "+53 5 123-4567" → "5351234567".
 *  Sirve para el matching de clientes (Customer.normalizedPhone). */
export function normalizePhone(value: string): string {
  return value.replace(/\D+/g, "");
}

export function isValidPhone(value: string): boolean {
  const digits = normalizePhone(value);
  return digits.length >= 7 && digits.length <= 15;
}
