import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "파크리오 배터리 119",
  description: "청소기 배터리, 이제 들고 나가지 마세요. 파크리오 주민 전용 배터리 교체 서비스.",
  appleWebApp: { title: "배터리 119", capable: true, statusBarStyle: "default" },
  manifest: "/app.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#9a6a3a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=Noto+Serif+KR:wght@600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
