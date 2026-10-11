import { CardRowsSkeleton, StoreScreenSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <StoreScreenSkeleton>
      <CardRowsSkeleton />
    </StoreScreenSkeleton>
  );
}
