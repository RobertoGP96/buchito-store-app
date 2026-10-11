"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { DISPLAY_CURRENCY_COOKIE, writePreferenceCookie } from "@/lib/preferences";
import { fromBaseAmount } from "@/lib/currency-math";
import { DEFAULT_CURRENCY, fmt, type CurrencyInfo } from "@/lib/format";

/** Lo que el servidor manda al cliente para pintar montos: moneda base,
 *  monedas activas y la tasa de cada una a base (base por 1 unidad). Las
 *  monedas sin tasa no vienen: no se pueden mostrar. */
export interface CurrencyContextData {
  base: CurrencyInfo;
  currencies: CurrencyInfo[];
  rates: Record<number, number>;
}

export const EMPTY_CURRENCY_CONTEXT: CurrencyContextData = {
  base: DEFAULT_CURRENCY,
  currencies: [DEFAULT_CURRENCY],
  rates: { [DEFAULT_CURRENCY.currencyId]: 1 },
};

interface CurrencyApi extends CurrencyContextData {
  display: CurrencyInfo;
  setDisplay: (code: string) => void;
  /** Convierte un monto en base a la moneda de display (solo visual). */
  toDisplay: (amountBase: number) => number;
  /** "4 750 CUP" o "≈ 12.50 USD" cuando la moneda de display no es la base. */
  formatBase: (amountBase: number) => string;
  /** Formatea un monto que YA está en la moneda indicada (pagos, precios de origen). */
  formatIn: (amount: number, currency: CurrencyInfo) => string;
}

const CurrencyContext = createContext<CurrencyApi | null>(null);

export function CurrencyProvider({
  data,
  lockToBase = false,
  initialDisplayCode,
  children,
}: {
  data: CurrencyContextData;
  /** Admin y mensajero trabajan siempre en base: ignoran la preferencia de la tienda. */
  lockToBase?: boolean;
  /** Código guardado en cookie, leído por el layout servidor: así los precios
   *  salen ya en la moneda elegida y no parpadean en base tras hidratar. */
  initialDisplayCode?: string;
  children: React.ReactNode;
}) {
  const [displayCode, setDisplayCode] = useState(() =>
    !lockToBase && initialDisplayCode && data.currencies.some((c) => c.code === initialDisplayCode)
      ? initialDisplayCode
      : data.base.code
  );

  const display = useMemo(
    () => data.currencies.find((c) => c.code === displayCode) ?? data.base,
    [data.currencies, data.base, displayCode]
  );

  const setDisplay = useCallback(
    (code: string) => {
      if (!data.currencies.some((c) => c.code === code)) return;
      setDisplayCode(code);
      writePreferenceCookie(DISPLAY_CURRENCY_COOKIE, code);
    },
    [data.currencies]
  );

  const toDisplay = useCallback(
    (amountBase: number) => {
      if (display.currencyId === data.base.currencyId) return amountBase;
      const rate = data.rates[display.currencyId];
      if (!rate) return amountBase;
      return fromBaseAmount(amountBase, rate, display.decimalPlaces);
    },
    [display, data.base.currencyId, data.rates]
  );

  const formatBase = useCallback(
    (amountBase: number) => {
      if (display.currencyId === data.base.currencyId) {
        return fmt(amountBase, data.base);
      }
      return `≈ ${fmt(toDisplay(amountBase), display)}`;
    },
    [display, data.base, toDisplay]
  );

  const formatIn = useCallback(
    (amount: number, currency: CurrencyInfo) => fmt(amount, currency),
    []
  );

  const value = useMemo<CurrencyApi>(
    () => ({ ...data, display, setDisplay, toDisplay, formatBase, formatIn }),
    [data, display, setDisplay, toDisplay, formatBase, formatIn]
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyApi {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency debe usarse dentro de CurrencyProvider");
  }
  return context;
}
