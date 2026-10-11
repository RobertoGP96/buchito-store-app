"use client";

import { lazyDialog } from "@/components/lazy-dialog";
import { useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { CornerDownRight, FolderTree, Pencil, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { SelectOption } from "@/components/form/fields";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import type { CategoryRow } from "../queries/category-queries";
import { cn } from "@/lib/utils";

const CategoryForm = lazyDialog(() => import("./category-form").then((m) => m.CategoryForm));

/** Ids de la categoría y de todas sus descendientes (no pueden ser su padre). */
function subtreeIds(rows: CategoryRow[], rootId: number): Set<number> {
  const ids = new Set<number>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const row of rows) {
      if (row.parentId != null && ids.has(row.parentId) && !ids.has(row.categoryId)) {
        ids.add(row.categoryId);
        grew = true;
      }
    }
  }
  return ids;
}

export function CategoryList({ rows }: { rows: CategoryRow[] }) {
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [open, setOpen] = useState(false);

  const parentOptions = useMemo<SelectOption[]>(() => {
    const excluded = editing ? subtreeIds(rows, editing.categoryId) : new Set<number>();
    return rows
      .filter((r) => !excluded.has(r.categoryId))
      .map((r) => ({ value: String(r.categoryId), label: `${"— ".repeat(r.depth)}${r.name}` }));
  }, [rows, editing]);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (row: CategoryRow) => {
    setEditing(row);
    setOpen(true);
  };

  const columns: ListColumn<CategoryRow>[] = [
    {
      id: "name",
      header: "Categoría",
      isRowHeader: true,
      cell: (r) => (
        <div className={cn("flex min-w-0 items-center gap-2", r.depth > 0 && "pl-5")}>
          {r.depth > 0 && <CornerDownRight className="h-3.5 w-3.5 flex-none text-slate-300" strokeWidth={1.9} />}
          <div className="min-w-0">
            <p className="font-semibold text-ink">{r.name}</p>
            <p className="text-[12px] text-slate-400">{r.slug}</p>
          </div>
        </div>
      ),
    },
    { id: "products", header: "Productos", align: "right", cell: (r) => <span className="tabular">{r.productCount}</span> },
    { id: "order", header: "Orden", align: "right", cell: (r) => <span className="tabular">{r.sortOrder}</span> },
    {
      id: "status",
      header: "Estado",
      cell: (r) => <StatusChip label={r.isActive ? "Activa" : "Inactiva"} tone={r.isActive ? "success" : "neutral"} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <Button variant="ghost" size="sm" isIconOnly aria-label={`Editar ${r.name}`} onPress={() => openEdit(r)}>
          <Pencil className="h-4 w-4" strokeWidth={1.9} />
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-end">
        <Button variant="primary" className="rounded-full" onPress={openNew}>
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          Nueva categoría
        </Button>
      </div>

      <ResponsiveList
        rows={rows}
        rowKey={(r) => r.categoryId}
        columns={columns}
        ariaLabel="Categorías"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState icon={FolderTree} title="Sin categorías" description="Crea la primera categoría." size="compact" />
          </div>
        }
        renderCard={(r) => (
          <ListCard
            title={r.parentName ? `${r.parentName} › ${r.name}` : r.name}
            subtitle={r.slug}
            badge={<StatusChip label={r.isActive ? "Activa" : "Inactiva"} tone={r.isActive ? "success" : "neutral"} />}
            rows={[
              { label: "Productos", value: r.productCount },
              { label: "Subcategorías", value: r.childCount },
            ]}
            actions={
              <Button variant="outline" size="sm" className="rounded-full" onPress={() => openEdit(r)}>
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
                Editar
              </Button>
            }
          />
        )}
      />

      <CategoryForm
        key={editing?.categoryId ?? "new"}
        open={open}
        onOpenChange={setOpen}
        category={editing}
        parentOptions={parentOptions}
      />
    </>
  );
}
