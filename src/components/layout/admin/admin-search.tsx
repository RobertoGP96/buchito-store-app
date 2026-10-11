"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Modal } from "@heroui/react";
import {
  Boxes,
  CornerDownLeft,
  Inbox,
  LoaderCircle,
  Package,
  Search,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Money } from "@/components/money";
import { StatusChip } from "@/components/status-chip";
import { ADMIN_NAV, type NavEntry } from "@/lib/nav-registry";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_META } from "@/modules/orders/lib/labels";
import { PRODUCT_STATUS_META } from "@/modules/products/lib/labels";
import { searchAdminAction } from "@/modules/search/actions/search-actions";
import {
  EMPTY_SEARCH_RESULT,
  SEARCH_MAX_LENGTH,
  SEARCH_MIN_LENGTH,
  type AdminSearchResult,
} from "@/modules/search/lib/schemas";

const DEBOUNCE_MS = 220;
/** Coincidencias de navegación cuando hay término: las secciones son pocas y
 *  el espacio lo necesitan los pedidos, clientes y productos. */
const NAV_HITS_WITH_TERM = 4;

type GroupId = "nav" | "orders" | "customers" | "products" | "fallback";

const GROUP_LABELS: Record<GroupId, string> = {
  nav: "Ir a",
  orders: "Pedidos",
  customers: "Clientes",
  products: "Productos",
  fallback: "Buscar en",
};

const GROUP_ORDER: GroupId[] = ["nav", "orders", "customers", "products", "fallback"];

interface SearchItem {
  id: string;
  group: GroupId;
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}

/** Sin tildes ni mayúsculas: "categorias" encuentra "Categorías". */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function navItem(entry: NavEntry): SearchItem {
  return {
    id: `nav-${entry.id}`,
    group: "nav",
    href: entry.href,
    icon: entry.icon,
    title: entry.label,
    subtitle: entry.description,
  };
}

function matchNav(term: string): NavEntry[] {
  const needle = fold(term);
  if (!needle) return ADMIN_NAV;
  return ADMIN_NAV.filter(
    (entry) => fold(entry.label).includes(needle) || (entry.description && fold(entry.description).includes(needle))
  ).slice(0, NAV_HITS_WITH_TERM);
}

function buildItems(term: string, results: AdminSearchResult): SearchItem[] {
  const items: SearchItem[] = matchNav(term).map(navItem);
  const canQuery = term.length >= SEARCH_MIN_LENGTH;

  for (const o of results.orders) {
    const meta = ORDER_STATUS_META[o.status];
    items.push({
      id: `order-${o.orderId}`,
      group: "orders",
      href: `/admin/pedidos/${o.orderId}`,
      icon: Inbox,
      title: o.orderNo,
      subtitle: o.customerName,
      trailing: (
        <span className="flex items-center gap-2">
          <Money value={o.total} className="text-[12px] font-semibold text-slate-500" />
          <StatusChip label={meta.label} tone={meta.tone} />
        </span>
      ),
    });
  }
  for (const c of results.customers) {
    items.push({
      id: `customer-${c.customerId}`,
      group: "customers",
      href: `/admin/clientes/${c.customerId}`,
      icon: Users,
      title: c.name,
      subtitle: [c.phone, c.email].filter(Boolean).join(" · "),
    });
  }
  for (const p of results.products) {
    const meta = PRODUCT_STATUS_META[p.status];
    items.push({
      id: `product-${p.productId}`,
      group: "products",
      href: `/admin/productos/${p.productId}`,
      icon: Package,
      title: p.name,
      subtitle: p.sku ? `SKU ${p.sku}` : undefined,
      trailing: <StatusChip label={meta.label} tone={meta.tone} />,
    });
  }

  if (canQuery) {
    const q = encodeURIComponent(term);
    items.push(
      {
        id: "fallback-customers",
        group: "fallback",
        href: `/admin/clientes?q=${q}`,
        icon: Users,
        title: `Clientes con «${term}»`,
        subtitle: "Listado completo filtrado",
      },
      {
        id: "fallback-inventory",
        group: "fallback",
        href: `/admin/inventario?q=${q}`,
        icon: Boxes,
        title: `Inventario con «${term}»`,
        subtitle: "Variantes por nombre o SKU",
      }
    );
  }

  return GROUP_ORDER.flatMap((group) => items.filter((item) => item.group === group));
}

interface AdminSearchProps {
  className?: string;
}

/** Buscador global del panel: navegación, pedidos, clientes y productos en
 *  una paleta (Ctrl/⌘ K). En desktop se abre desde un campo en la cabecera;
 *  en móvil desde un icono. */
export function AdminSearch({ className }: AdminSearchProps) {
  const router = useRouter();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestSeq = useRef(0);

  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<AdminSearchResult>(EMPTY_SEARCH_RESULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  // Atajo global: el campo del header es solo un disparador visual.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // El diálogo entra animado y `autoFocus` puede caer mientras aún no es
  // enfocable; se insiste un par de veces durante la entrada.
  useEffect(() => {
    if (!open) return;
    const timers = [0, 60, 200].map((ms) => window.setTimeout(() => inputRef.current?.focus(), ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [open]);

  const trimmed = term.trim();

  // Consulta al servidor con retardo; una respuesta vieja nunca pisa a una nueva.
  useEffect(() => {
    if (!open) return;
    if (trimmed.length < SEARCH_MIN_LENGTH) {
      setResults(EMPTY_SEARCH_RESULT);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const seq = ++requestSeq.current;
    const timer = window.setTimeout(async () => {
      const result = await searchAdminAction({ term: trimmed });
      if (seq !== requestSeq.current) return;
      if (result.success) {
        setResults(result.data);
      } else {
        setResults(EMPTY_SEARCH_RESULT);
        setError(result.error);
      }
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [open, trimmed]);

  const items = useMemo(() => buildItems(trimmed, results), [trimmed, results]);

  useEffect(() => {
    setActiveIndex(0);
  }, [items]);

  useEffect(() => {
    const active = items[activeIndex];
    if (!active) return;
    document.getElementById(`${listboxId}-${active.id}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, items, listboxId]);

  const close = useCallback(() => {
    setOpen(false);
    setTerm("");
    setResults(EMPTY_SEARCH_RESULT);
    setError(null);
    setLoading(false);
    requestSeq.current++;
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (next) setOpen(true);
    else close();
  };

  const go = useCallback(
    (item: SearchItem) => {
      close();
      router.push(item.href);
    },
    [close, router]
  );

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (items.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = items[activeIndex];
      if (item) go(item);
    }
  };

  const showEmpty = !loading && !error && items.length === 0;
  const activeItem = items[activeIndex];
  const shortcut = isMac ? "⌘ K" : "Ctrl K";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar en el panel"
        className={cn(
          "hidden h-9 items-center gap-2 rounded-full border-[1.5px] border-line bg-page pr-2 pl-3 text-[13px] text-slate-400 transition-colors duration-150 hover:border-navy-700/40 hover:text-slate-500 md:flex md:w-[260px] lg:w-[320px]",
          className
        )}
      >
        <Search className="h-4 w-4 flex-none" strokeWidth={1.9} />
        <span className="min-w-0 flex-1 truncate text-left">Buscar pedidos, clientes, productos…</span>
        <kbd className="hidden rounded-md border border-line bg-canvas px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-slate-400 lg:inline-block">
          {shortcut}
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar en el panel"
        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors duration-150 hover:bg-hover hover:text-navy-700 md:hidden"
      >
        <Search className="h-5 w-5" strokeWidth={2} />
      </button>

      <Modal isOpen={open} onOpenChange={handleOpenChange}>
        <Modal.Backdrop>
          <Modal.Container placement="top" size="lg">
            <Modal.Dialog aria-label="Buscar en el panel" className="overflow-hidden bg-canvas p-0">
              <div className="field-shell flex h-14 items-center gap-3 border-b border-line px-4">
                {loading ? (
                  <LoaderCircle className="h-[18px] w-[18px] flex-none animate-spin text-navy-700" strokeWidth={2} />
                ) : (
                  <Search className="h-[18px] w-[18px] flex-none text-slate-400" strokeWidth={1.9} />
                )}
                <input
                  ref={inputRef}
                  autoFocus
                  type="text"
                  role="combobox"
                  value={term}
                  maxLength={SEARCH_MAX_LENGTH}
                  onChange={(e) => setTerm(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="Folio, cliente, teléfono, producto o SKU"
                  aria-label="Buscar en el panel"
                  aria-expanded="true"
                  aria-controls={listboxId}
                  aria-activedescendant={activeItem ? `${listboxId}-${activeItem.id}` : undefined}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-slate-400"
                />
                {term ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTerm("");
                      inputRef.current?.focus();
                    }}
                    aria-label="Borrar búsqueda"
                    className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-slate-400 hover:bg-hover hover:text-navy-700"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={close}
                    className="flex-none rounded-md border border-line bg-page px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-slate-400 hover:text-navy-700"
                  >
                    Esc
                  </button>
                )}
              </div>

              <div
                id={listboxId}
                role="listbox"
                aria-label="Resultados"
                className="no-scrollbar max-h-[min(60dvh,440px)] overflow-y-auto px-2 py-2"
              >
                {error && <p className="px-3 py-6 text-center text-[13px] text-danger">{error}</p>}
                {showEmpty && (
                  <p className="px-3 py-8 text-center text-[13px] text-slate-400">
                    Sin resultados para «{trimmed}»
                  </p>
                )}
                {GROUP_ORDER.map((group) => {
                  const groupItems = items.filter((item) => item.group === group);
                  if (groupItems.length === 0) return null;
                  return (
                    <div key={group} role="group" aria-label={GROUP_LABELS[group]} className="mb-1.5 last:mb-0">
                      <p className="eyebrow px-3 pt-2 pb-1.5">{GROUP_LABELS[group]}</p>
                      {groupItems.map((item) => {
                        const index = items.indexOf(item);
                        const active = index === activeIndex;
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.id}
                            id={`${listboxId}-${item.id}`}
                            role="option"
                            aria-selected={active}
                            onMouseMove={() => {
                              if (!active) setActiveIndex(index);
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => go(item)}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-field px-3 py-2.5 transition-colors duration-100",
                              active ? "bg-tint text-navy-700" : "text-ink"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-8 w-8 flex-none items-center justify-center rounded-[10px]",
                                active ? "bg-canvas text-navy-700" : "bg-page text-slate-500"
                              )}
                            >
                              <Icon className="h-4 w-4" strokeWidth={1.9} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13.5px] font-semibold">{item.title}</span>
                              {item.subtitle && (
                                <span className="block truncate text-[12px] text-slate-400">{item.subtitle}</span>
                              )}
                            </span>
                            {item.trailing && <span className="hidden flex-none sm:inline-flex">{item.trailing}</span>}
                            {active && (
                              <CornerDownLeft className="hidden h-3.5 w-3.5 flex-none text-slate-400 md:block" strokeWidth={2} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className="hidden items-center gap-4 border-t border-line px-4 py-2 text-[11px] text-slate-400 md:flex">
                <span>
                  <kbd className="font-sans font-semibold">↑↓</kbd> moverse
                </span>
                <span>
                  <kbd className="font-sans font-semibold">↵</kbd> abrir
                </span>
                <span>
                  <kbd className="font-sans font-semibold">Esc</kbd> cerrar
                </span>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
