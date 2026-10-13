import { CardRowsSkeleton, StoreScreenSkeleton } from "@/components/skeletons";

export default function RecipientsLoading() {
  return (
    <StoreScreenSkeleton back>
      <CardRowsSkeleton />
    </StoreScreenSkeleton>
  );
}
