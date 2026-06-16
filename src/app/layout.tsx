import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Mailtrap SaaS Starter",
  description: "Blank-slate Next.js SaaS scaffolding with Mailtrap email layer",
};

/** Root HTML shell with site header and global styles. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
