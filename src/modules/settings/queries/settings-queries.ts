import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { decimalToNumber, decimalToNullableNumber } from "@/lib/money";
import type { CurrencyInfo } from "@/lib/format";

export interface StoreSettingsData {
  storeName: string;
  baseCurrency: CurrencyInfo | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  orderPrefix: string;
  defaultShippingFee: number;
  freeShippingThreshold: number | null;
  lowStockThreshold: number;
  allowPickup: boolean;
}

const SETTINGS_INCLUDE = { baseCurrency: true } as const;

/** Singleton id=1: se crea con defaults la primera vez que alguien lo pide,
 *  así ninguna pantalla tiene que tratar el caso "sin configuración". Es una
 *  lectura pura; antes era un `upsert` y escribía en la DB en cada request. */
async function loadStoreSettings() {
  const existing = await db.storeSetting.findUnique({ where: { id: 1 }, include: SETTINGS_INCLUDE });
  if (existing) return existing;
  try {
    return await db.storeSetting.create({ data: { id: 1 }, include: SETTINGS_INCLUDE });
  } catch {
    // Dos primeros requests a la vez: el otro ya la creó.
    return db.storeSetting.findUniqueOrThrow({ where: { id: 1 }, include: SETTINGS_INCLUDE });
  }
}

/** Deduplicada por request: layout, página y dashboard la piden a la vez. */
export const getStoreSettings = cache(async (): Promise<StoreSettingsData> => {
  const row = await loadStoreSettings();
  return {
    storeName: row.storeName,
    baseCurrency: row.baseCurrency
      ? {
          currencyId: row.baseCurrency.currencyId,
          code: row.baseCurrency.code,
          symbol: row.baseCurrency.symbol,
          decimalPlaces: row.baseCurrency.decimalPlaces,
        }
      : null,
    phone: row.phone,
    email: row.email,
    address: row.address,
    orderPrefix: row.orderPrefix,
    defaultShippingFee: decimalToNumber(row.defaultShippingFee),
    freeShippingThreshold: decimalToNullableNumber(row.freeShippingThreshold),
    lowStockThreshold: row.lowStockThreshold,
    allowPickup: row.allowPickup,
  };
});

/** Variante tolerante para la tienda pública: con la DB caída la tienda
 *  sigue pintando el shell. */
export async function getStoreSettingsSafe(): Promise<StoreSettingsData | null> {
  try {
    return await getStoreSettings();
  } catch (error) {
    console.error("getStoreSettingsSafe:", error);
    return null;
  }
}
