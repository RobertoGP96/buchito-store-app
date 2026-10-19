"use client";

import { Dropdown } from "@heroui/react";
import { ChevronDown, Coins } from "lucide-react";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import { cn } from "@/lib/utils";

interface CurrencySwitcherProps {
  className?: string;
}

/** Selector de moneda de visualización. Solo aparece cuando hay más de una
 *  moneda con tasa: con una sola no hay nada que elegir. */
export function CurrencySwitcher({ className }: CurrencySwitcherProps) {
  const { currencies, display, setDisplay, base } = useCurrency();
  if (currencies.length <= 1) return null;

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={`Moneda: ${display.code}`}
        className={cn(
          "nav-label inline-flex h-9 items-center gap-1 rounded-full px-2 text-slate-500 sm:gap-1.5 sm:px-2.5 transition-colors duration-150 hover:bg-hover hover:text-navy-700",
          className
        )}
      >
        <Coins className="h-[18px] w-[18px] flex-none" strokeWidth={1.9} />
        <span className="tabular">{display.code}</span>
        <ChevronDown className="hidden h-3.5 w-3.5 flex-none sm:block" strokeWidth={2} />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          aria-label="Elegir moneda"
          selectionMode="single"
          selectedKeys={[display.code]}
          onAction={(key) => setDisplay(String(key))}
        >
          {currencies.map((currency) => (
            <Dropdown.Item key={currency.code} id={currency.code} textValue={currency.code}>
              <span className="tabular font-semibold">{currency.code}</span>
              <span className="ml-2 text-[12px] text-slate-400">
                {currency.name ?? ""}
                {currency.currencyId === base.currencyId && " · base"}
              </span>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
