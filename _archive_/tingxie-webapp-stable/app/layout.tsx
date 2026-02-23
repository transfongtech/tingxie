import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tingxie Practice - 聽寫默寫",
  description: "Master your Chinese spelling with audio flashcards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "bg-gray-50 min-h-screen text-slate-800")}>
        {children}
        {/* force rebuild */}</body>
    </html>
  );
}
