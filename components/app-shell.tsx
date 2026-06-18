"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  CreditCard,
  LayoutDashboard,
  LogOut,
  NotebookPen,
  ReceiptText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Logo } from "@/components/logo";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: ReceiptText },
  { href: "/direct-debits", label: "Direct Debits", icon: CreditCard },
  { href: "/history", label: "History", icon: CalendarClock },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/notes", label: "Notes", icon: NotebookPen },
];

export function AppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 bg-ink/75 px-5 py-6 backdrop-blur-xl lg:block">
        <Logo />
        <nav className="mt-10 space-y-2">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-[8px] px-3 py-3 text-sm font-bold transition ${
                  active
                    ? "bg-white text-ink"
                    : "text-white/68 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-6 left-5 right-5 rounded-[8px] border border-white/10 bg-white/6 p-3">
          <p className="truncate text-xs font-semibold text-white/55">{email}</p>
          <button className="mt-3 w-full btn btn-secondary" onClick={signOut}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/78 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Logo compact />
          <button className="btn btn-secondary" onClick={signOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 rounded-[8px] px-3 py-2 text-xs font-bold ${
                  active ? "bg-white text-ink" : "bg-white/8 text-white/70"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="px-4 py-6 lg:ml-72 lg:px-8">{children}</main>
    </div>
  );
}
