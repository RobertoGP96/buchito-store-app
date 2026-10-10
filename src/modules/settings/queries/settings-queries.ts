import "server-only";
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

/** Singleton id=1: se crea con defaults la primera vez que alguien lo pide,
 *  así ninguna pantalla tiene que tratar el caso "sin configuración". */
export async function getStoreSettings(): Promise<StoreSettingsData> {
  const row = await db.storeSetting.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
    include: { baseCurrency: true },
  });
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
}

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
