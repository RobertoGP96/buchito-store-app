import "server-only";
import { db } from "@/lib/db";

export interface RecipientRow {
  recipientId: number;
  label: string | null;
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

/** Destinatarios de la ficha de cliente del usuario con sesión (vacío si aún
 *  no tiene ficha). Principal primero. */
export async function getRecipientsForUser(userId: number): Promise<RecipientRow[]> {
  const rows = await db.recipient.findMany({
    where: { customer: { userId } },
    include: { zone: { select: { name: true } } },
    orderBy: [{ isDefault: "desc" }, { recipientId: "asc" }],
  });
  return rows.map((r) => ({
    recipientId: r.recipientId,
    label: r.label,
    name: r.name,
    phone: r.phone,
    line1: r.line1,
    line2: r.line2,
    neighborhood: r.neighborhood,
    reference: r.reference,
    zoneId: r.zoneId,
    zoneName: r.zone?.name ?? null,
    isDefault: r.isDefault,
  }));
}
