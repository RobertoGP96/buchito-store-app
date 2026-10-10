"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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

export const DISPLAY_CURRENCY_STORAGE_KEY = "buchito-currency";

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
  children,
}: {
  data: CurrencyContextData;
  children: React.ReactNode;
}) {
  const [displayCode, setDisplayCode] = useState(data.base.code);

  // La preferencia vive en localStorage: el primer render debe coincidir con
  // el servidor (base), y solo después se aplica la elegida.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY);
      if (saved && data.currencies.some((c) => c.code === saved)) {
        setDisplayCode(saved);
      }
    } catch {
      // Sin storage: se queda en base.
    }
  }, [data.currencies]);

  const display = useMemo(
    () => data.currencies.find((c) => c.code === displayCode) ?? data.base,
    [data.currencies, data.base, displayCode]
  );

  const setDisplay = useCallback(
    (code: string) => {
      if (!data.currencies.some((c) => c.code === code)) return;
      setDisplayCode(code);
      try {
        localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, code);
      } catch {
        // Modo privado: la elección dura la sesión.
      }
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
