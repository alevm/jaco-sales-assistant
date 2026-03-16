"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/items", label: "Inventario", icon: "👕" },
  { href: "/items/new", label: "Nuovo Capo", icon: "➕" },
  { href: "/lots", label: "Lotti", icon: "📦" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-stone-900 text-stone-100 flex flex-col">
      <div className="p-4 border-b border-stone-700">
        <h1 className="text-lg font-bold text-amber-400">VintageAgent</h1>
        <p className="text-xs text-stone-400 mt-0.5">AI Sales Assistant</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
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
  );
}
