"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, Briefcase, Settings } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Feed", href: "/", icon: Home },
    { name: "My Bets", href: "/my-bets", icon: Briefcase },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "Admin", href: "/admin", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background/95 border-t border-border backdrop-blur-md py-3 px-6 flex justify-between items-center z-50">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center gap-1 transition-colors duration-200 ${
              isActive ? "text-[#00C853]" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={20} className={isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(0,200,83,0.5)]" : ""} />
            <span className="text-[10px] font-medium uppercase tracking-wider">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
