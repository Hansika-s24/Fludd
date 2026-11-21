import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/admin-console";

export const metadata: Metadata = {
  title: "Review reports · Fludd",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="min-h-dvh overflow-y-auto">
      <AdminConsole />
    </div>
  );
}
