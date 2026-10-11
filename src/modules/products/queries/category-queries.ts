import "server-only";
import { db } from "@/lib/db";

export interface CategoryRow {
  categoryId: number;
  parentId: number | null;
  parentName: string | null;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  /** 0 = raíz. El árbol se aplana en orden de recorrido para pintar listas. */
  depth: number;
  productCount: number;
  childCount: number;
}

/** Árbol aplanado (padre, hijos, siguiente padre…) ordenado por sortOrder y nombre. */
export async function getCategoryTree(): Promise<CategoryRow[]> {
  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true, children: true } } },
  });
  const byParent = new Map<number | null, typeof rows>();
  for (const row of rows) {
    const list = byParent.get(row.parentId) ?? [];
    list.push(row);
    byParent.set(row.parentId, list);
  }
  const byId = new Map(rows.map((r) => [r.categoryId, r]));

  const out: CategoryRow[] = [];
  const walk = (parentId: number | null, depth: number) => {
    for (const row of byParent.get(parentId) ?? []) {
      out.push({
        categoryId: row.categoryId,
        parentId: row.parentId,
        parentName: row.parentId ? (byId.get(row.parentId)?.name ?? null) : null,
        name: row.name,
        slug: row.slug,
        description: row.description,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        depth,
        productCount: row._count.products,
        childCount: row._count.children,
      });
      walk(row.categoryId, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
