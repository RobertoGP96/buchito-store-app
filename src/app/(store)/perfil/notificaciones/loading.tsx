import { CardRowsSkeleton, StoreScreenSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <StoreScreenSkeleton back>
      <CardRowsSkeleton rows={5} />
    </StoreScreenSkeleton>
  );
}
