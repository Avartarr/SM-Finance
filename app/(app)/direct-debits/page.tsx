import { Suspense } from "react";
import { FinanceApp } from "@/components/finance-app";

export default function DirectDebitsPage() {
  return (
    <Suspense fallback={<div className="text-white">Loading...</div>}>
      <FinanceApp view="direct-debits" />
    </Suspense>
  );
}
