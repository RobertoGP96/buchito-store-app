import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { decimalToNumber } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";
import type { Role } from "@/lib/roles";
import type { OrderSummaryRow } from "@/modules/orders/queries/order-queries";

export interface CustomerRow {
  customerId: number;
  name: string;
  phone: string;
  email: string | null;
  /** Tiene usuario vinculado; si no, es una ficha de invitado. */
  hasAccount: boolean;
  orderCount: number;
  /** Σ total (en base) de los pedidos no cancelados. */
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string;
}

export type CustomerOrderRow = Pick<
  OrderSummaryRow,
  "orderId" | "orderNo" | "status" | "paymentStatus" | "total" | "createdAt"
>;

export interface CustomerAddressRow {
  addressId: number;
  label: string | null;
  recipientName: string | null;
  phone: string | null;
  line1: string;
  line2: string | null;
  neighborhood: string | null;
  city: string;
  reference: string | null;
  zoneName: string | null;
  isDefault: boolean;
}

export interface CustomerDetailData {
  customerId: number;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  hasAccount: boolean;
  createdAt: string;
  user: { email: string; role: Role; isActive: boolean } | null;
  addresses: CustomerAddressRow[];
  orders: CustomerOrderRow[];
  orderCount: number;
  totalSpent: number;
}

const LIST_LIMIT = 500;

function buildWhere(q: string | undefined): Prisma.CustomerWhereInput | undefined {
  const term = q?.trim();
  if (!term) return undefined;
  const digits = normalizePhone(term);
  const or: Prisma.CustomerWhereInput[] = [
    { name: { contains: term, mode: "insensitive" } },
    { email: { contains: term, mode: "insensitive" } },
    { phone: { contains: term } },
  ];
  // "+53 5 123" y "53512" deben encontrar el mismo teléfono.
  if (digits.length >= 3) or.push({ normalizedPhone: { contains: digits } });
  return { OR: or };
}

export async function getCustomers(filters: { q?: string } = {}): Promise<CustomerRow[]> {
  const customers = await db.customer.findMany({
    where: buildWhere(filters.q),
    orderBy: { createdAt: "desc" },
    take: LIST_LIMIT,
  });
  if (customers.length === 0) return [];

  const ids = customers.map((c) => c.customerId);
  const [activity, spent] = await Promise.all([
    db.order.groupBy({
      by: ["customerId"],
      where: { customerId: { in: ids } },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    db.order.groupBy({
      by: ["customerId"],
      where: { customerId: { in: ids }, status: { not: "cancelled" } },
      _sum: { total: true },
    }),
  ]);
  const activityById = new Map(activity.map((a) => [a.customerId, a]));
  const spentById = new Map(spent.map((s) => [s.customerId, decimalToNumber(s._sum.total)]));

  const rows: CustomerRow[] = customers.map((c) => {
    const a = activityById.get(c.customerId);
    return {
      customerId: c.customerId,
      name: c.name,
      phone: c.phone,
      email: c.email,
      hasAccount: c.userId != null,
      orderCount: a?._count._all ?? 0,
      totalSpent: spentById.get(c.customerId) ?? 0,
      lastOrderAt: a?._max.createdAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    };
  });

  // Último movimiento primero: el último pedido o, sin pedidos, el alta.
  return rows.sort((x, y) => (y.lastOrderAt ?? y.createdAt).localeCompare(x.lastOrderAt ?? x.createdAt));
}

export async function getCustomerById(customerId: number): Promise<CustomerDetailData | null> {
  const row = await db.customer.findUnique({
    where: { customerId },
    include: {
      user: { select: { email: true, role: true, isActive: true } },
      addresses: {
        include: { zone: { select: { name: true } } },
        orderBy: [{ isDefault: "desc" }, { addressId: "asc" }],
      },
      orders: {
        select: {
          orderId: true,
          orderNo: true,
          status: true,
          paymentStatus: true,
          total: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!row) return null;

  const orders: CustomerOrderRow[] = row.orders.map((o) => ({
    orderId: o.orderId,
    orderNo: o.orderNo,
    status: o.status,
    paymentStatus: o.paymentStatus,
    total: decimalToNumber(o.total),
    createdAt: o.createdAt.toISOString(),
  }));

  return {
    customerId: row.customerId,
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    isActive: row.isActive,
    hasAccount: row.userId != null,
    createdAt: row.createdAt.toISOString(),
    user: row.user ? { email: row.user.email, role: row.user.role, isActive: row.user.isActive } : null,
    addresses: row.addresses.map((a) => ({
      addressId: a.addressId,
      label: a.label,
      recipientName: a.recipientName,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2,
      neighborhood: a.neighborhood,
      city: a.city,
      reference: a.reference,
      zoneName: a.zone?.name ?? null,
      isDefault: a.isDefault,
    })),
    orders,
    orderCount: orders.length,
    totalSpent: row.orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + decimalToNumber(o.total), 0),
  };
}
