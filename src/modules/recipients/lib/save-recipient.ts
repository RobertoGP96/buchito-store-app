import type { Prisma } from "@/generated/prisma";
import type { RecipientValues } from "./schemas";

/** Crea un destinatario dentro de una tx. Si va a ser el principal, primero
 *  destrona al actual: el índice parcial `uq_recipient_default_per_customer`
 *  solo admite uno por cliente. El primero que se guarda es principal. */
export async function createRecipientInTx(
  tx: Prisma.TransactionClient,
  customerId: number,
  data: RecipientValues
): Promise<{ recipientId: number }> {
  const count = await tx.recipient.count({ where: { customerId } });
  const isDefault = data.isDefault || count === 0;
  if (isDefault) {
    await tx.recipient.updateMany({ where: { customerId, isDefault: true }, data: { isDefault: false } });
  }
  const row = await tx.recipient.create({
    data: { ...data, customerId, isDefault },
    select: { recipientId: true },
  });
  return row;
}
