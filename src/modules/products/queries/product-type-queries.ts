import "server-only";
import { db } from "@/lib/db";
import { parseAttributeSchema, type AttributeDef } from "../lib/attribute-schema";

export interface ProductTypeRow {
  typeId: number;
  name: string;
  slug: string;
  description: string | null;
  attributeSchema: AttributeDef[];
  isActive: boolean;
  productCount: number;
}

export async function getProductTypes(): Promise<ProductTypeRow[]> {
  const rows = await db.productType.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return rows.map((row) => ({
    typeId: row.typeId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    attributeSchema: parseAttributeSchema(row.attributeSchema),
    isActive: row.isActive,
    productCount: row._count.products,
  }));
}
