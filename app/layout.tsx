import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionTimeout from "@/components/session-timeout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NativeFlow | AI英会話で話せる英語を",
  description:
    "AIと毎日会話することで、自然に英語が口から出るようになる語学学習サービス。7日間無料で体験できます。",
  metadataBase: new URL("https://nativeflow.ai"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NativeFlow",
    description:
      "AIと話すだけで英語が口から出てくる。新しい語学学習体験。",
    url: "https://nativeflow.ai",
    siteName: "NativeFlow",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NativeFlow",
    description:
      "AIと会話して英語を身につける語学学習サービス",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionTimeout />
        {children}
      </body>
    </html>
  );
}
