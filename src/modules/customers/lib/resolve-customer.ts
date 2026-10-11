import type { Prisma } from "@/generated/prisma";
import { normalizePhone } from "@/lib/phone";

export interface ResolveCustomerInput {
  /** Usuario de la sesión; null en checkout de invitado. */
  userId: number | null;
  name: string;
  phone: string;
  email: string | null;
}

export interface ResolvedCustomer {
  customerId: number;
  userId: number | null;
}

/** Devuelve el `Customer` al que se cuelga un pedido, creándolo o
 *  actualizándolo dentro de la tx del pedido.
 *  - Con sesión: la ficha del usuario, o una nueva si no tiene. Aquí NO se
 *    enlaza una ficha de invitado por teléfono: el teléfono lo teclea el
 *    propio usuario sin verificar y le daría acceso al historial de pedidos
 *    de otra persona. Ese enlace solo ocurre al registrarse.
 *  - Invitado: la ficha más reciente sin cuenta con ese teléfono, o una nueva. */
export async function resolveCustomer(
  tx: Prisma.TransactionClient,
  input: ResolveCustomerInput
): Promise<ResolvedCustomer> {
  const phone = input.phone.trim();
  const normalizedPhone = normalizePhone(phone);
  const email = input.email?.trim() || null;

  if (input.userId != null) {
    const own = await tx.customer.findUnique({ where: { userId: input.userId } });
    if (own) {
      const patch: Prisma.CustomerUpdateInput = {};
      if (own.normalizedPhone !== normalizedPhone || own.phone !== phone) {
        patch.phone = phone;
        patch.normalizedPhone = normalizedPhone;
      }
      if (email && own.email !== email) patch.email = email;
      if (Object.keys(patch).length > 0) {
        await tx.customer.update({ where: { customerId: own.customerId }, data: patch });
      }
      return { customerId: own.customerId, userId: own.userId };
    }

    const row = await tx.customer.create({
      data: { userId: input.userId, name: input.name, phone, normalizedPhone, email },
    });
    return { customerId: row.customerId, userId: row.userId };
  }

  const guest = await findGuest(tx, normalizedPhone);
  if (guest) {
    const patch: Prisma.CustomerUpdateInput = {};
    if (guest.name !== input.name) patch.name = input.name;
    if (guest.phone !== phone) patch.phone = phone;
    if (email && guest.email !== email) patch.email = email;
    if (Object.keys(patch).length > 0) {
      await tx.customer.update({ where: { customerId: guest.customerId }, data: patch });
    }
    return { customerId: guest.customerId, userId: null };
  }

  const created = await tx.customer.create({
    data: { name: input.name, phone, normalizedPhone, email },
  });
  return { customerId: created.customerId, userId: null };
}

function findGuest(tx: Prisma.TransactionClient, normalizedPhone: string) {
  return tx.customer.findFirst({
    where: { normalizedPhone, userId: null },
    orderBy: { createdAt: "desc" },
  });
}
