import { Suspense } from "react";
import { FinanceApp } from "@/components/finance-app";

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="text-white">Loading...</div>}>
      <FinanceApp view="history" />
    </Suspense>
  );
}
