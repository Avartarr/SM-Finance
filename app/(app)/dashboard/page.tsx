import { Suspense } from "react";
import { FinanceApp } from "@/components/finance-app";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-white">Loading...</div>}>
      <FinanceApp view="dashboard" />
    </Suspense>
  );
}
