import { RouteTransition } from "@/components/route-transition";

export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <RouteTransition className="flex flex-1 flex-col gap-6">{children}</RouteTransition>;
}
