import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Candle — 모의투자 플랫폼",
  description: "실시간 시장 데이터로 배우는 안전한 주식 투자 경험",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
