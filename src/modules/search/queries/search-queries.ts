import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { decimalToNumber } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";
import { EMPTY_SEARCH_RESULT, SEARCH_MIN_LENGTH, type AdminSearchResult } from "../lib/schemas";

/** Pocos resultados por grupo: la paleta es para saltar a una ficha, no para
 *  listar; el listado completo lo da cada sección con su propio filtro. */
const HIT_LIMIT = 5;

function contains(term: string): Prisma.StringFilter {
  return { contains: term, mode: "insensitive" };
}

/** Búsqueda global del panel: pedidos (folio, cliente, teléfono), clientes
 *  (nombre, correo, teléfono) y productos (nombre, slug, SKU). */
export async function searchAdmin(rawTerm: string): Promise<AdminSearchResult> {
  const term = rawTerm.trim();
  if (term.length < SEARCH_MIN_LENGTH) return EMPTY_SEARCH_RESULT;
  const digits = normalizePhone(term);
  const phoneFilter = digits.length >= 3 ? digits : null;

  const customerOr: Prisma.CustomerWhereInput[] = [
    { name: contains(term) },
    { email: contains(term) },
    { phone: { contains: term } },
  ];
  if (phoneFilter) customerOr.push({ normalizedPhone: { contains: phoneFilter } });

  const orderOr: Prisma.OrderWhereInput[] = [
    { orderNo: contains(term) },
    { customerName: contains(term) },
    { customerPhone: { contains: term } },
  ];

  const [orders, customers, products] = await Promise.all([
    db.order.findMany({
      where: { OR: orderOr },
      orderBy: { createdAt: "desc" },
      take: HIT_LIMIT,
      select: { orderId: true, orderNo: true, customerName: true, status: true, total: true },
    }),
    db.customer.findMany({
      where: { OR: customerOr },
      orderBy: { createdAt: "desc" },
      take: HIT_LIMIT,
      select: { customerId: true, name: true, phone: true, email: true },
    }),
    db.product.findMany({
      where: {
        OR: [{ name: contains(term) }, { slug: contains(term) }, { variants: { some: { sku: contains(term) } } }],
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      take: HIT_LIMIT,
      select: {
        productId: true,
        name: true,
        status: true,
        variants: { where: { sku: contains(term) }, take: 1, select: { sku: true } },
      },
    }),
  ]);

  return {
    orders: orders.map((o) => ({
      orderId: o.orderId,
      orderNo: o.orderNo,
      customerName: o.customerName,
      status: o.status,
      total: decimalToNumber(o.total),
    })),
    customers,
    products: products.map((p) => ({
      productId: p.productId,
      name: p.name,
      status: p.status,
      sku: p.variants[0]?.sku ?? null,
    })),
  };
}
