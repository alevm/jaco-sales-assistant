"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const NAV = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/items", label: "Inventario", icon: "👕" },
  { href: "/items/new", label: "Nuovo Capo", icon: "➕" },
  { href: "/lots", label: "Lotti", icon: "📦" },
  { href: "/changelog", label: "Changelog", icon: "📋" },
  { href: "/feedback", label: "Feedback", icon: "💬" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Chiudi menu" : "Apri menu"}
        aria-expanded={open}
        className="fixed top-3 left-3 z-50 md:hidden bg-stone-900 text-amber-400 p-2 rounded-lg shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Backdrop (mobile only) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Navigazione laterale"
        className={`fixed left-0 top-0 h-screen w-56 bg-stone-900 text-stone-100 flex flex-col z-40 transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="p-4 border-b border-stone-700">
          <h1 className="text-lg font-bold text-amber-400">VintageAgent</h1>
          <p className="text-xs text-stone-400 mt-0.5">AI Sales Assistant</p>
        </div>
        <nav role="navigation" aria-label="Menu principale" className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-amber-600/20 text-amber-300 font-medium"
                    : "text-stone-300 hover:bg-stone-800 hover:text-stone-100"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-stone-700 text-xs text-stone-500">
          Jaco Vintage &copy; 2026
        </div>
      </aside>
    </>
  );
}
