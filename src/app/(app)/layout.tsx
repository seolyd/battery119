import { TabBar } from "@/components/TabBar";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      {children}
      <TabBar />
    </div>
  );
}
