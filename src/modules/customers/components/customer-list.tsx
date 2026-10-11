"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Users, X } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import { fmtDate } from "@/lib/format";
import type { CustomerRow } from "../queries/customer-queries";

interface CustomerListProps {
  rows: CustomerRow[];
  query: string;
}

function AccountChip({ hasAccount }: { hasAccount: boolean }) {
  return <StatusChip label={hasAccount ? "Con cuenta" : "Invitado"} tone={hasAccount ? "info" : "neutral"} />;
}

/** El buscador vive en la URL (`?q=`) para que el servidor filtre y la
 *  búsqueda se pueda compartir, igual que en el catálogo. */
export function CustomerList({ rows, query }: CustomerListProps) {
  const router = useRouter();
  const [value, setValue] = useState(query);

  const go = (q: string) => {
    const term = q.trim();
    router.push(term ? `/admin/clientes?q=${encodeURIComponent(term)}` : "/admin/clientes");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    go(value);
  };

  const columns: ListColumn<CustomerRow>[] = [
    {
      id: "name",
      header: "Cliente",
      isRowHeader: true,
      cell: (r) => (
        <div className="min-w-0">
          <Link href={`/admin/clientes/${r.customerId}`} className="font-semibold text-navy-700 hover:underline">
            {r.name}
          </Link>
          <p className="tabular text-[12px] text-slate-400">{r.phone}</p>
        </div>
      ),
    },
    { id: "email", header: "Correo", cell: (r) => r.email ?? <span className="text-slate-400">—</span> },
    { id: "account", header: "Cuenta", cell: (r) => <AccountChip hasAccount={r.hasAccount} /> },
    { id: "orders", header: "Pedidos", align: "right", cell: (r) => <span className="tabular">{r.orderCount}</span> },
    { id: "spent", header: "Total comprado", align: "right", cell: (r) => <Money value={r.totalSpent} className="font-semibold" /> },
    {
      id: "last",
      header: "Último pedido",
      cell: (r) => (
        <span className="tabular text-slate-500">{r.lastOrderAt ? fmtDate(r.lastOrderAt) : "—"}</span>
      ),
    },
  ];

  return (
    <>
      <form
        onSubmit={submit}
        role="search"
        className="field-shell flex h-10 items-center gap-2 rounded-full border-[1.5px] border-line bg-canvas pr-1.5 pl-4 md:w-[320px]"
      >
        <Search className="h-4 w-4 flex-none text-slate-400" strokeWidth={1.9} />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Nombre, teléfono o correo"
          aria-label="Buscar clientes"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-slate-400"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              go("");
            }}
            aria-label="Limpiar búsqueda"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-hover hover:text-navy-700"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </form>

      <ResponsiveList
        rows={rows}
        rowKey={(r) => r.customerId}
        columns={columns}
        ariaLabel="Clientes"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState
              icon={Users}
              title={query ? "Sin resultados" : "Sin clientes"}
              description={
                query
                  ? `Ningún cliente coincide con "${query}".`
                  : "Las fichas se crean solas con el primer pedido de cada cliente."
              }
              size="compact"
            />
          </div>
        }
        renderCard={(r) => (
          <Link href={`/admin/clientes/${r.customerId}`} className="block">
            <ListCard
              title={r.name}
              subtitle={r.email ? `${r.phone} · ${r.email}` : r.phone}
              badge={<AccountChip hasAccount={r.hasAccount} />}
              rows={[
                { label: "Pedidos", value: r.orderCount },
                { label: "Total comprado", value: <Money value={r.totalSpent} /> },
                { label: "Último pedido", value: r.lastOrderAt ? fmtDate(r.lastOrderAt) : "—" },
              ]}
            />
          </Link>
        )}
      />
    </>
  );
}
