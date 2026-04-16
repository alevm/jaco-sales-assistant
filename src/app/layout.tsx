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
      <head>
        <script defer src="https://analytics.levm.eu/script.js" data-website-id="afab5d37-791b-4e17-8870-c714c3fc7751" data-do-not-track="true"></script>
      </head>
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-4 pt-16 md:pt-6 md:p-6 md:ml-56">{children}</main>
      </body>
    </html>
  );
}
