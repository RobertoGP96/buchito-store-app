import "server-only";
import { db } from "@/lib/db";

export interface RecipientRow {
  addressId: number;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  neighborhood: string | null;
  reference: string | null;
  zoneId: number | null;
  zoneName: string | null;
  isDefault: boolean;
}

/** Destinatarios guardados del cliente, el principal primero. Las filas sin
 *  nombre ni teléfono propios (direcciones anteriores a los destinatarios)
 *  salen con los del cliente. */
export async function getRecipientsForCustomer(customerId: number): Promise<RecipientRow[]> {
  const customer = await db.customer.findUnique({
    where: { customerId },
    select: {
      name: true,
      phone: true,
      addresses: {
        include: { zone: { select: { name: true } } },
        orderBy: [{ isDefault: "desc" }, { addressId: "asc" }],
      },
    },
  });
  if (!customer) return [];

  return customer.addresses.map((a) => ({
    addressId: a.addressId,
    name: a.recipientName ?? customer.name,
    phone: a.phone ?? customer.phone,
    line1: a.line1,
    line2: a.line2,
    neighborhood: a.neighborhood,
    reference: a.reference,
    zoneId: a.zoneId,
    zoneName: a.zone?.name ?? null,
    isDefault: a.isDefault,
  }));
}
