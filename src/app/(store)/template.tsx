export default function StoreTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-transition flex flex-1 flex-col">{children}</div>;
}
