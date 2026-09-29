import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Cursor, SmoothScroll } from "@/components";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "ApnaDukan — Bolo. Aapki dukaan online ho jaayegi.",
  description: "Voice se website: Hindi, English aur Marwari mein bolkar teen minute mein apni dukaan online layein.",
};
export const viewport: Viewport = { themeColor: "#050505" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <SmoothScroll />
        <Cursor />
        {children}
      </body>
    </html>
  );
}
