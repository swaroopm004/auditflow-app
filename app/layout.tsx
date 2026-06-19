import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { HydrationProvider } from "@/components/layout/hydration-provider";

export const metadata: Metadata = {
  title: "AuditFlow Suite",
  description: "Indian statutory and tax audit workflow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <HydrationProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto px-6 py-6">{children}</div>
            </main>
          </div>
        </HydrationProvider>
      </body>
    </html>
  );
}
