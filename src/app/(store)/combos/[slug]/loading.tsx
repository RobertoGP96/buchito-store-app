import { Skeleton } from "@heroui/react";
import { StoreScreenSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <StoreScreenSkeleton back>
      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <Skeleton className="aspect-square w-full rounded-card" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-2.5 w-32 rounded-full" />
          <Skeleton className="h-7 w-3/4 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="mt-2 h-12 w-full rounded-full" />
        </div>
      </div>
    </StoreScreenSkeleton>
  );
}
