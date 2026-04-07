import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: '이음 메타버스 — 해운대순복음교회',
    template: '%s | 이음 메타버스',
  },
  description: '해운대순복음교회 성도들이 시공간을 초월해 예배·교제·사역을 함께 경험하는 웹 기반 가상 교회 플랫폼',
  keywords: ['해운대순복음교회', '이음', '메타버스', '가상교회', '온라인예배'],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
