import { RouteTransition } from "@/components/route-transition";

export default function CourierTemplate({ children }: { children: React.ReactNode }) {
  return <RouteTransition className="flex flex-1 flex-col gap-5">{children}</RouteTransition>;
}
