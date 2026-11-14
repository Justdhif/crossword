"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo & Title with Next.js Link & Image */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Image
              src="/globe.svg"
              alt="Logo Crossword"
              width={22}
              height={22}
              className="invert brightness-0"
            />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Crossword<span className="text-indigo-600 dark:text-indigo-400">Web</span>
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Teka-Teki Silang
            </p>
          </div>
        </Link>

        {/* Action: Theme Toggle */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
