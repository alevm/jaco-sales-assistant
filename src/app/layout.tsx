import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

export const metadata: Metadata = {
  title: "VintageAgent — AI Sales Assistant",
  description: "AI-powered vintage clothing sales assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 ml-56">{children}</main>
      </body>
    </html>
  );
}
