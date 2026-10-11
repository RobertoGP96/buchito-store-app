import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { CACHE_FALLBACK_SECONDS, CACHE_TAGS } from "@/lib/cache-tags";
import {
  BaseCurrencyNotConfiguredError,
  getBaseCurrencyCached,
  getRatesToBaseCached,
} from "@/lib/currency";
import type { CurrencyInfo } from "@/lib/format";
import {
  EMPTY_CURRENCY_CONTEXT,
  type CurrencyContextData,
} from "../store/currency-provider";

export interface CurrencyRow extends CurrencyInfo {
  name: string;
  isActive: boolean;
  sortOrder: number;
  isBase: boolean;
  /** Tasa a base vigente (base por 1 unidad); null si no hay par configurado. */
  rateToBase: number | null;
  paymentMethodCount: number;
}

export async function getCurrencies(): Promise<CurrencyRow[]> {
  const [rows, settings] = await Promise.all([
    db.currency.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include: { _count: { select: { paymentMethods: true } } },
    }),
    db.storeSetting.findUnique({ where: { id: 1 }, select: { baseCurrencyId: true } }),
  ]);
  const baseId = settings?.baseCurrencyId ?? null;
  let rates = new Map<number, { rate: number }>();
  if (baseId) {
    if (rows.some((r) => r.currencyId === baseId)) {
      rates = (await getRatesToBaseCached()).rates;
    }
  }
  return rows.map((row) => ({
    currencyId: row.currencyId,
    code: row.code,
    name: row.name,
    symbol: row.symbol,
    decimalPlaces: row.decimalPlaces,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    isBase: row.currencyId === baseId,
    rateToBase: rates.get(row.currencyId)?.rate ?? null,
    paymentMethodCount: row._count.paymentMethods,
  }));
}

/** Monedas activas en la Data Cache: cambian solo desde el admin. */
const loadActiveCurrencies = unstable_cache(
  (): Promise<CurrencyInfo[]> =>
    db.currency.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      select: { currencyId: true, code: true, symbol: true, decimalPlaces: true, name: true },
    }),
  ["active-currencies"],
  { tags: [CACHE_TAGS.currency], revalidate: CACHE_FALLBACK_SECONDS }
);

export async function getActiveCurrencies(): Promise<CurrencyInfo[]> {
  return loadActiveCurrencies();
}

/** Lo que la tienda pública necesita para pintar montos en cualquier moneda
 *  activa con tasa. Sin configuración (DB vacía) devuelve CUP de respaldo
 *  para que la tienda siga renderizando. */
export async function getCurrencyContext(): Promise<CurrencyContextData> {
  try {
    const base = await getBaseCurrencyCached();
    const [{ rates }, active] = await Promise.all([getRatesToBaseCached(), loadActiveCurrencies()]);
    const currencies = active.filter((c) => rates.has(c.currencyId));
    if (!currencies.some((c) => c.currencyId === base.currencyId)) {
      currencies.unshift({ ...base, name: base.code });
    }
    const rateMap: Record<number, number> = {};
    for (const c of currencies) {
      rateMap[c.currencyId] = rates.get(c.currencyId)!.rate;
    }
    return { base, currencies, rates: rateMap };
  } catch (error) {
    if (!(error instanceof BaseCurrencyNotConfiguredError)) {
      console.error("getCurrencyContext:", error);
    }
    return EMPTY_CURRENCY_CONTEXT;
  }
}
