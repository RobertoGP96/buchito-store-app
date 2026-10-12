import "server-only";
import { db } from "@/lib/db";
import { BaseCurrencyNotConfiguredError, getBaseCurrencyCached } from "@/lib/currency";
import type { CurrencyInfo } from "@/lib/format";
import { decimalToNullableNumber, decimalToNumber } from "@/lib/money";

export interface RateHistoryRow {
  historyId: number;
  oldRate: number | null;
  newRate: number;
  changedBy: string | null;
  note: string | null;
  changedAt: string;
}

export interface RateOverviewRow {
  currency: CurrencyInfo;
  /** Base por 1 unidad de la moneda; null si no hay par configurado. */
  rate: number | null;
  exchangeRateId: number | null;
  version: number | null;
  /** true cuando el par guardado es base → moneda y la tasa mostrada es 1/rate. */
  isInverse: boolean;
  updatedAt: string | null;
  history: RateHistoryRow[];
  /** Variantes con precio en esta moneda: sin tasa dejan de venderse. */
  variantCount: number;
}

export interface RatesOverview {
  base: CurrencyInfo | null;
  rows: RateOverviewRow[];
}

export async function getRatesOverview(): Promise<RatesOverview> {
  let base: CurrencyInfo;
  try {
    base = await getBaseCurrencyCached();
  } catch (error) {
    if (error instanceof BaseCurrencyNotConfiguredError) return { base: null, rows: [] };
    throw error;
  }

  const [currencies, pairs] = await Promise.all([
    db.currency.findMany({
      where: { isActive: true, currencyId: { not: base.currencyId } },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include: { _count: { select: { variants: true } } },
    }),
    db.exchangeRate.findMany({
      where: {
        OR: [{ quoteCurrencyId: base.currencyId }, { baseCurrencyId: base.currencyId }],
      },
      include: {
        history: {
          orderBy: { changedAt: "desc" },
          take: 10,
          include: { changedBy: { select: { fullName: true } } },
        },
      },
    }),
  ]);

  const rows: RateOverviewRow[] = currencies.map((currency) => {
    const direct = pairs.find(
      (p) => p.baseCurrencyId === currency.currencyId && p.quoteCurrencyId === base.currencyId
    );
    const inverse = direct
      ? undefined
      : pairs.find(
          (p) => p.baseCurrencyId === base.currencyId && p.quoteCurrencyId === currency.currencyId
        );
    const pair = direct ?? inverse ?? null;
    const isInverse = !direct && Boolean(inverse);
    const toShown = (value: number) => (isInverse ? 1 / value : value);

    return {
      currency: {
        currencyId: currency.currencyId,
        code: currency.code,
        symbol: currency.symbol,
        decimalPlaces: currency.decimalPlaces,
        name: currency.name,
      },
      rate: pair ? toShown(decimalToNumber(pair.rate)) : null,
      exchangeRateId: pair?.exchangeRateId ?? null,
      version: pair?.version ?? null,
      isInverse,
      updatedAt: pair ? pair.updatedAt.toISOString() : null,
      history: (pair?.history ?? []).map((h) => ({
        historyId: h.historyId,
        oldRate: h.oldRate == null ? null : toShown(decimalToNullableNumber(h.oldRate)!),
        newRate: toShown(decimalToNumber(h.newRate)),
        changedBy: h.changedBy?.fullName ?? null,
        note: h.note,
        changedAt: h.changedAt.toISOString(),
      })),
      variantCount: currency._count.variants,
    };
  });

  return { base, rows };
}
