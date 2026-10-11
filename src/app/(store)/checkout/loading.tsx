import { CardRowsSkeleton, StoreScreenSkeleton } from "@/components/skeletons";

export default function CheckoutLoading() {
  return (
    <StoreScreenSkeleton back>
      <CardRowsSkeleton rows={4} />
    </StoreScreenSkeleton>
  );
}
