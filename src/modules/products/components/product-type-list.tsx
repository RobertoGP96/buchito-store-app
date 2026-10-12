"use client";

import { lazyDialog } from "@/components/lazy-dialog";
import { useState } from "react";
import { Button } from "@heroui/react";
import { Pencil, Plus, Tags } from "lucide-react";
import { DeleteButton } from "@/components/delete-button";
import { EmptyState } from "@/components/empty-state";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import { deleteProductType } from "../actions/product-type-actions";
import type { ProductTypeRow } from "../queries/product-type-queries";

const ProductTypeForm = lazyDialog(() => import("./product-type-form").then((m) => m.ProductTypeForm));

function attributeSummary(row: ProductTypeRow): string {
  if (row.attributeSchema.length === 0) return "Sin atributos";
  return row.attributeSchema
    .map((a) => (a.scope === "variant" ? `${a.label} (variante)` : a.label))
    .join(", ");
}

function DeleteTypeButton({ row, appearance }: { row: ProductTypeRow; appearance: "icon" | "button" }) {
  return (
    <DeleteButton
      appearance={appearance}
      itemLabel={`el tipo ${row.name}`}
      description={`Se eliminará el tipo de producto ${row.name} y su esquema de atributos.`}
      blockedReason={
        row.productCount > 0
          ? `Hay ${row.productCount} ${row.productCount === 1 ? "producto" : "productos"} de este tipo. Cámbialos de tipo o elimínalos primero.`
          : null
      }
      successMessage={`Tipo ${row.name} eliminado`}
      onConfirm={() => deleteProductType(row.typeId)}
    />
  );
}

export function ProductTypeList({ rows }: { rows: ProductTypeRow[] }) {
  const [editing, setEditing] = useState<ProductTypeRow | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (row: ProductTypeRow) => {
    setEditing(row);
    setOpen(true);
  };

  const columns: ListColumn<ProductTypeRow>[] = [
    {
      id: "name",
      header: "Tipo",
      isRowHeader: true,
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink">{r.name}</p>
          <p className="text-[12px] text-slate-400">{r.slug}</p>
        </div>
      ),
    },
    { id: "attributes", header: "Atributos", cell: (r) => <span className="text-[13px] text-slate-500">{attributeSummary(r)}</span> },
    { id: "products", header: "Productos", align: "right", cell: (r) => <span className="tabular">{r.productCount}</span> },
    {
      id: "status",
      header: "Estado",
      cell: (r) => <StatusChip label={r.isActive ? "Activo" : "Inactivo"} tone={r.isActive ? "success" : "neutral"} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" isIconOnly aria-label={`Editar ${r.name}`} onPress={() => openEdit(r)}>
            <Pencil className="h-4 w-4" strokeWidth={1.9} />
          </Button>
          <DeleteTypeButton row={r} appearance="icon" />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-end">
        <Button variant="primary" className="rounded-full" onPress={openNew}>
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          Nuevo tipo
        </Button>
      </div>

      <ResponsiveList
        rows={rows}
        rowKey={(r) => r.typeId}
        columns={columns}
        ariaLabel="Tipos de producto"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState icon={Tags} title="Sin tipos" description="Crea el primer tipo de producto." size="compact" />
          </div>
        }
        renderCard={(r) => (
          <ListCard
            title={r.name}
            subtitle={attributeSummary(r)}
            badge={<StatusChip label={r.isActive ? "Activo" : "Inactivo"} tone={r.isActive ? "success" : "neutral"} />}
            rows={[{ label: "Productos", value: r.productCount }]}
            actions={
              <>
                <Button variant="outline" size="sm" className="rounded-full" onPress={() => openEdit(r)}>
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
                  Editar
                </Button>
                <DeleteTypeButton row={r} appearance="button" />
              </>
            }
          />
        )}
      />

      <ProductTypeForm key={editing?.typeId ?? "new"} open={open} onOpenChange={setOpen} type={editing} />
    </>
  );
}
