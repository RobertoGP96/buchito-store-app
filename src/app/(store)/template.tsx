import { RouteTransition } from "@/components/route-transition";

export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  return <RouteTransition className="flex flex-1 flex-col">{children}</RouteTransition>;
}
