import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tingxie Practice 2.1 — 听写练习助手",
  description: "专为 George 设计的听写练习平台，支持阅读障碍辅助与中英词汇管理。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#FBF7F0] min-h-screen text-[#2D2D2D] antialiased selection:bg-amber-100 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}
