"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  BadgePercent,
  Bike,
  HandCoins,
  Landmark,
  Package,
  Receipt,
  Scale,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import { CHIP_BASE, CHIP_OFF, CHIP_ON } from "@/components/choice-chips";
import { Money } from "@/components/money";
import { LinkPending } from "@/components/nav-icon";
import { StatGroup, StatTile, type StatTileProps } from "@/components/stat-tile";
import { cn } from "@/lib/utils";
import { PAYMENT_RANGE_LABELS, PAYMENT_RANGES, type PaymentRange } from "@/modules/payments/lib/payment-ranges";
import type { FinanceSummary } from "../queries/finance-queries";
import { ScrollFadeRow } from "@/components/scroll-fade-row";

type Tile = StatTileProps;

function pct(value: number | null): string {
  return value == null ? "—" : `${value} %`;
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

export function FinanceSummaryView({ summary, activeRange }: { summary: FinanceSummary; activeRange: PaymentRange }) {
  const groups: { label: string; tiles: Tile[] }[] = [
    {
      label: "Resultado",
      tiles: [
        {
          label: "Ventas",
          value: <Money value={summary.sales} />,
          hint: plural(summary.orders, "pedido", "pedidos"),
          icon: Banknote,
          tone: "featured",
        },
        {
          label: "Ganancia bruta",
          value: <Money value={summary.grossProfit} />,
          hint: `Margen ${pct(summary.grossMarginPct)} sobre la mercancía`,
          icon: TrendingUp,
          tone: summary.grossProfit < 0 ? "bad" : "good",
        },
        {
          label: "Ganancia neta",
          value: <Money value={summary.netProfit} />,
          hint: "Tras envío, mensajeros y recargos",
          icon: Landmark,
          tone: summary.netProfit < 0 ? "bad" : undefined,
        },
        {
          label: "Costo de mercancía",
          value: <Money value={summary.cogs} />,
          hint:
            summary.linesWithoutCost > 0
              ? plural(summary.linesWithoutCost, "línea sin costo", "líneas sin costo")
              : "Todas las líneas con costo",
          icon: Package,
          tone: summary.linesWithoutCost > 0 ? "warn" : undefined,
        },
      ],
    },
    {
      label: "Desglose",
      tiles: [
        { label: "Mercancía cobrada", value: <Money value={summary.productRevenue} />, hint: "Subtotal menos descuentos", icon: Receipt },
        { label: "Descuentos", value: <Money value={summary.discounts} />, hint: "Cupones aplicados", icon: BadgePercent },
        {
          label: "Envío cobrado",
          value: <Money value={summary.shippingCollected} />,
          hint: (
            <>
              Mensajeros −<Money value={summary.courierCosts} />
            </>
          ),
          icon: Truck,
        },
        {
          label: "Envío neto",
          value: <Money value={summary.shippingNet} />,
          hint: summary.surcharges > 0 ? <>Recargos de pago +<Money value={summary.surcharges} /></> : "Sin recargos de pago",
          icon: Scale,
          tone: summary.shippingNet < 0 ? "bad" : undefined,
        },
      ],
    },
    {
      label: "Caja",
      tiles: [
        { label: "Cobrado", value: <Money value={summary.collected} />, hint: "Pagos registrados en el periodo", icon: Wallet },
        {
          label: "Por cobrar",
          value: <Money value={summary.receivable} />,
          hint: "Pedidos sin pagar (total)",
          icon: AlertTriangle,
          tone: summary.receivable > 0 ? "warn" : undefined,
        },
        { label: "Pagado a mensajeros", value: <Money value={summary.courierPaid} />, hint: "Liquidaciones del periodo", icon: HandCoins },
        {
          label: "Devengado a mensajeros",
          value: <Money value={summary.courierCosts} />,
          hint: "Entregas completadas en el periodo",
          icon: Bike,
        },
      ],
    },
  ];

  return (
    <>
      <ScrollFadeRow>
        {PAYMENT_RANGES.map((range) => (
          <Link
            key={range}
            href={`/admin/finanzas?range=${range}`}
            scroll={false}
            className={cn(CHIP_BASE, activeRange === range ? CHIP_ON : CHIP_OFF)}
          >
            {PAYMENT_RANGE_LABELS[range]}
            <LinkPending />
          </Link>
        ))}
      </ScrollFadeRow>

      {summary.linesWithoutCost > 0 && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-field bg-warn-soft px-4 py-3 text-[13px] leading-[1.5] text-warn"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" strokeWidth={2} />
          <span>
            <span className="font-semibold">Hay ventas sin costo registrado:</span> la ganancia mostrada es una cota
            superior. Registra el precio de compra en cada variante (o en la entrada de stock) para afinarla.
          </span>
        </p>
      )}

      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <StatGroup key={group.label} label={group.label}>
            {group.tiles.map((tile) => (
              <StatTile key={tile.label} {...tile} />
            ))}
          </StatGroup>
        ))}
      </div>
    </>
  );
}
