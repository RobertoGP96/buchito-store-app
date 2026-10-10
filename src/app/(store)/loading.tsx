import { Skeleton } from "@heroui/react";

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3.5 rounded-card bg-canvas p-3 pb-4 shadow-card sm:p-4 sm:pb-5">
      <Skeleton className="aspect-square w-full rounded-field" />
      <Skeleton className="h-2.5 w-16 rounded-full" />
      <Skeleton className="h-3.5 w-3/4 rounded-full" />
      <div className="mt-1 flex items-center justify-between border-t border-line pt-3">
        <Skeleton className="h-4 w-20 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full sm:w-16" />
      </div>
    </div>
  );
}

export default function StoreLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pt-7 pb-10 md:px-6 md:pt-9">
      <Skeleton className="h-2.5 w-24 rounded-full" />
      <Skeleton className="mt-3 h-7 w-56 rounded-full md:h-8" />
      <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
