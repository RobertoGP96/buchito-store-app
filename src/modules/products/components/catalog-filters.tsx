"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import { CHIP_BASE, CHIP_OFF, CHIP_ON } from "@/components/choice-chips";
import { LinkPending } from "@/components/nav-icon";
import type { CatalogCategory } from "../queries/catalog-queries";
import { cn } from "@/lib/utils";
import { ScrollFadeRow } from "@/components/scroll-fade-row";

interface CatalogFiltersProps {
  categories: CatalogCategory[];
  activeSlug: string;
  query: string;
}

function catalogHref(slug: string | null, q: string): string {
  const params = new URLSearchParams();
  if (slug) params.set("cat", slug);
  if (q.trim()) params.set("q", q.trim());
  const qs = params.toString();
  return qs ? `/catalogo?${qs}` : "/catalogo";
}

/** Chips de categorías raíz + buscador. Los filtros viven en la URL
 *  (`?cat=&q=`) para que se puedan compartir y el servidor filtre. */
export function CatalogFilters({ categories, activeSlug, query }: CatalogFiltersProps) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  // La búsqueda navega dentro de una transición: la lista anterior se queda
  // visible y el icono de la lupa pasa a spinner hasta que llega la nueva.
  const [isPending, startTransition] = useTransition();
  const roots = categories.filter((c) => c.parentId === null);
  const active = categories.find((c) => c.slug === activeSlug);
  // Si la activa es hija, el chip encendido es su padre.
  const activeRootId = active ? (active.parentId ?? active.categoryId) : null;

  const navigate = (href: string) => {
    startTransition(() => router.push(href, { scroll: false }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(catalogHref(activeSlug || null, value));
  };

  const clear = () => {
    setValue("");
    navigate(catalogHref(activeSlug || null, ""));
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <ScrollFadeRow>
        <Link
          href={catalogHref(null, query)}
          scroll={false}
          className={cn(CHIP_BASE, activeRootId === null ? CHIP_ON : CHIP_OFF)}
        >
          Todo
          <LinkPending />
        </Link>
        {roots.map((category) => (
          <Link
            key={category.categoryId}
            href={catalogHref(category.slug, query)}
            scroll={false}
            className={cn(CHIP_BASE, activeRootId === category.categoryId ? CHIP_ON : CHIP_OFF)}
          >
            {category.name}
            <LinkPending />
          </Link>
        ))}
      </ScrollFadeRow>

      <form
        onSubmit={submit}
        role="search"
        className="field-shell flex h-10 items-center gap-2 rounded-full border-[1.5px] border-line bg-canvas pr-1.5 pl-4 md:w-[280px]"
      >
        {isPending ? (
          <LoaderCircle className="nav-spinner h-4 w-4 flex-none text-ink-subtle" strokeWidth={2} aria-hidden />
        ) : (
          <Search className="h-4 w-4 flex-none text-ink-subtle" strokeWidth={1.9} />
        )}
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Buscar productos"
          aria-label="Buscar productos"
          // 16px en móvil: por debajo, Safari de iOS amplía la página al enfocar.
          className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-subtle md:type-body"
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            aria-label="Limpiar búsqueda"
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-subtle hover:bg-hover hover:text-tostado-700"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </form>
    </div>
  );
}
