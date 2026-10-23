import type { Metadata } from "next";

import { app } from "@/config/app";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: app.name,
    template: `%s · ${app.name}`,
  },
  description: app.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
