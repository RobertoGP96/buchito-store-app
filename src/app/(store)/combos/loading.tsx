import { CatalogResultsSkeleton, StoreScreenSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <StoreScreenSkeleton>
      <CatalogResultsSkeleton />
    </StoreScreenSkeleton>
  );
}
