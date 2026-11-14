import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CrosswordProvider } from "@/context/crossword-context";
import { Navbar } from "@/components/layout/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crossword Web - Teka-Teki Silang Real-Time",
  description:
    "Aplikasi Teka-Teki Silang interaktif dengan dua endpoint: Papan Utama & Input Jawaban dengan animasi smooth Framer Motion.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
        <CrosswordProvider>
          <Navbar />
          <main className="flex-1 pb-12">{children}</main>
        </CrosswordProvider>
      </body>
    </html>
  );
}
