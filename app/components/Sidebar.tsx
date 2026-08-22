"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "../../lib/supabase/client";

const navigation = [
  { name: "Dashboard", href: "/" },
  { name: "Transactions", href: "/transactions" },
  { name: "Accounts", href: "/accounts" },
  { name: "Budgets", href: "/budgets" },
  { name: "Savings Goals", href: "/goals" },
  { name: "Investments", href: "/investments" },
  { name: "AI Assistant", href: "/assistant" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    try {
      setLoggingOut(true);

      await supabase.auth.signOut();

      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(href);
  }

  return (
    <>
      {/* MOBILE TOP BAR */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <div>
          <p className="text-lg font-bold text-slate-900">
            FinSight AI
          </p>
          <p className="text-xs text-slate-500">
            Smarter personal finance
          </p>
        </div>

        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-700 shadow-sm"
          aria-label="Open menu"
        >
          ☰
        </button>
      </div>

      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <button
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close menu"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-72 flex-col
          border-r border-slate-200 bg-white
          transition-transform duration-300
          md:static md:z-auto md:w-64 md:translate-x-0
          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 md:border-b-0">
          <div>
            <p className="text-xl font-bold text-slate-900">
              FinSight AI
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Smarter personal finance
            </p>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-slate-500 hover:bg-slate-100 md:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-2xl bg-slate-900 p-4 text-white">
            <p className="text-sm font-semibold">
              Need financial insight?
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-300">
              Ask FinSight AI about your spending,
              savings, goals, or investments.
            </p>

            <Link
              href="/assistant"
              onClick={() => setMobileOpen(false)}
              className="mt-4 block rounded-xl bg-white px-4 py-2 text-center text-sm font-semibold text-slate-900"
            >
              Ask AI
            </Link>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}