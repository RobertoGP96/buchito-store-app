import { isValidPhone, normalizePhone } from "./phone";

/** Enlace "click to chat" de WhatsApp: el número solo en dígitos (wa.me no
 *  admite "+", espacios, guiones ni el prefijo internacional "00") y el texto
 *  prellenado codificado en la query. `null` cuando no hay número o no es
 *  válido: quien pinta el botón lo trata como "WhatsApp no configurado".
 *  Puro: sirve en servidor y cliente. */
export function buildWhatsappLink(phone: string | null | undefined, text?: string | null): string | null {
  if (!phone) return null;
  const digits = normalizePhone(phone).replace(/^0+/, "");
  if (!isValidPhone(digits)) return null;
  const message = text?.trim();
  return message ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : `https://wa.me/${digits}`;
}
