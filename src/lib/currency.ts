import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import type { CurrencyInfo } from "@/lib/format";
import { roundToCurrency } from "@/lib/currency-math";

type PrismaTx = Prisma.TransactionClient;
export type DbOrTx = PrismaTx | typeof db;

export type BaseCurrencyInfo = CurrencyInfo;

// rate = unidades de moneda BASE por 1 unidad de la moneda origen.
// exchangeRateId es null cuando origen === base (identidad, sin fila en DB).
export type RateSnapshot = {
  exchangeRateId: number | null;
  rate: number;
};

export class GlobalRateNotConfiguredError extends Error {
  constructor(fromCode: string, baseCode: string) {
    super(
      `No hay una tasa de cambio configurada entre ${fromCode} y ${baseCode}. Configúrala en Tasas de cambio antes de continuar.`
    );
    this.name = "GlobalRateNotConfiguredError";
  }
}

export class BaseCurrencyNotConfiguredError extends Error {
  constructor() {
    super("La tienda no tiene moneda base configurada. Ejecuta el seed o elige una en Configuración.");
    this.name = "BaseCurrencyNotConfiguredError";
  }
}

export async function getBaseCurrency(client: DbOrTx): Promise<BaseCurrencyInfo> {
  const settings = await client.storeSetting.findUnique({
    where: { id: 1 },
    include: { baseCurrency: true },
  });
  if (!settings?.baseCurrency) throw new BaseCurrencyNotConfiguredError();
  const c = settings.baseCurrency;
  return {
    currencyId: c.currencyId,
    code: c.code,
    symbol: c.symbol,
    decimalPlaces: c.decimalPlaces,
  };
}

export async function getRateToBase(
  client: DbOrTx,
  fromCurrencyId: number,
  base?: BaseCurrencyInfo
): Promise<RateSnapshot> {
  const baseCurrency = base ?? (await getBaseCurrency(client));
  if (fromCurrencyId === baseCurrency.currencyId) {
    return { exchangeRateId: null, rate: 1 };
  }

  const direct = await client.exchangeRate.findUnique({
    where: {
      baseCurrencyId_quoteCurrencyId: {
        baseCurrencyId: fromCurrencyId,
        quoteCurrencyId: baseCurrency.currencyId,
      },
    },
  });
  if (direct) {
    return { exchangeRateId: direct.exchangeRateId, rate: direct.rate.toNumber() };
  }

  const inverse = await client.exchangeRate.findUnique({
    where: {
      baseCurrencyId_quoteCurrencyId: {
        baseCurrencyId: baseCurrency.currencyId,
        quoteCurrencyId: fromCurrencyId,
      },
    },
  });
  if (inverse) {
    return {
      exchangeRateId: inverse.exchangeRateId,
      rate: new Prisma.Decimal(1).dividedBy(inverse.rate).toNumber(),
    };
  }

  const from = await client.currency.findUnique({ where: { currencyId: fromCurrencyId } });
  throw new GlobalRateNotConfiguredError(from?.code ?? `#${fromCurrencyId}`, baseCurrency.code);
}

/** Tasas de todas las monedas activas hacia la base, en una sola lectura.
 *  Las monedas sin tasa no aparecen en el mapa. */
export async function getRatesToBase(
  client: DbOrTx,
  base?: BaseCurrencyInfo
): Promise<{ base: BaseCurrencyInfo; rates: Map<number, RateSnapshot> }> {
  const baseCurrency = base ?? (await getBaseCurrency(client));
  const rows = await client.exchangeRate.findMany({
    where: {
      OR: [
        { quoteCurrencyId: baseCurrency.currencyId },
        { baseCurrencyId: baseCurrency.currencyId },
      ],
    },
  });
  const rates = new Map<number, RateSnapshot>();
  rates.set(baseCurrency.currencyId, { exchangeRateId: null, rate: 1 });
  // El par directo (X → base) manda sobre el inverso si existen ambos.
  for (const row of rows) {
    if (row.baseCurrencyId === baseCurrency.currencyId && !rates.has(row.quoteCurrencyId)) {
      rates.set(row.quoteCurrencyId, {
        exchangeRateId: row.exchangeRateId,
        rate: new Prisma.Decimal(1).dividedBy(row.rate).toNumber(),
      });
    }
  }
  for (const row of rows) {
    if (row.quoteCurrencyId === baseCurrency.currencyId) {
      rates.set(row.baseCurrencyId, {
        exchangeRateId: row.exchangeRateId,
        rate: row.rate.toNumber(),
      });
    }
  }
  return { base: baseCurrency, rates };
}

export async function convertToBase(
  client: DbOrTx,
  amount: number,
  fromCurrencyId: number,
  base?: BaseCurrencyInfo
): Promise<{ amountBase: number; rate: number; exchangeRateId: number | null }> {
  const baseCurrency = base ?? (await getBaseCurrency(client));
  const snapshot = await getRateToBase(client, fromCurrencyId, baseCurrency);
  return {
    amountBase: roundToCurrency(amount * snapshot.rate, baseCurrency.decimalPlaces),
    rate: snapshot.rate,
    exchangeRateId: snapshot.exchangeRateId,
  };
}

export { roundToCurrency };
