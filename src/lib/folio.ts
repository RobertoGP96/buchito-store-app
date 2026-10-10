import type { Prisma } from "@/generated/prisma";

type PrismaTx = Prisma.TransactionClient;

export const DOC_TYPES = {
  ORDER: "ORDER",
} as const;

export type DocType = (typeof DOC_TYPES)[keyof typeof DOC_TYPES];

/** Siguiente folio de un tipo de documento, dentro de la transacción del
 *  documento. Upsert + incremento atómico: sin carreras entre pedidos
 *  simultáneos. El prefijo lo fija la configuración de la tienda la primera
 *  vez y luego vive en la secuencia. */
export async function nextFolio(
  tx: PrismaTx,
  docType: DocType,
  defaultPrefix: string
): Promise<string> {
  const seq = await tx.documentSequence.upsert({
    where: { docType },
    create: { docType, prefix: defaultPrefix, lastNumber: 1, padLength: 5 },
    update: { lastNumber: { increment: 1 } },
  });
  return `${seq.prefix}${String(seq.lastNumber).padStart(seq.padLength, "0")}`;
}
