import type { ReactNode } from "react";

import { AdminNav } from "@/components/layout/admin-nav";
import { requireAdmin } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="-mx-4 -my-8">
      <AdminNav />
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8">{children}</div>
    </div>
  );
}
