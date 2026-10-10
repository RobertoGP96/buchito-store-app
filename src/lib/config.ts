export const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? "Buchito";

// Contacto del footer: sin default a propósito. Un teléfono o correo inventado
// en producción es peor que no mostrar el bloque. Los valores reales viven en
// StoreSetting; estos solo sirven como respaldo antes de que exista la fila.
export const STORE_EMAIL = process.env.NEXT_PUBLIC_STORE_EMAIL ?? "";
export const STORE_PHONE = process.env.NEXT_PUBLIC_STORE_PHONE ?? "";
export const STORE_ADDRESS = process.env.NEXT_PUBLIC_STORE_ADDRESS ?? "";
