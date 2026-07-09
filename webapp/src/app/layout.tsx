import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Candle — 모의투자 플랫폼",
  description: "실시간 시장 데이터로 배우는 안전한 주식 투자 경험",
};

export const viewport: Viewport = {
  viewportFit: 'cover',
};

// Runs before first paint to apply the saved theme and avoid a flash of the wrong colors.
const themeInitScript = `(function(){try{var t=localStorage.getItem('candle-theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
