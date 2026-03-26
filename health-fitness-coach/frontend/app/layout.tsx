import type { Metadata } from "next";
import AppShell from "./AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health Fitness Coach AI",
  description: "Your personal AI fitness coach powered by LangGraph",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-900 text-slate-50">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
