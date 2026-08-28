"use client";

import React from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
  return (
    <header className="sticky top-0 w-full bg-background/85 backdrop-blur-md border-b border-border px-4 py-3 flex justify-between items-center z-40">
      <Link href="/" className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 bg-[#00C853] rounded-full shadow-[0_0_10px_#00C853]" />
        <span className="text-xl font-bold tracking-tight text-foreground">
          Predict<span className="text-[#00C853]">Naija</span>
        </span>
      </Link>
      
      <div className="scale-90 origin-right">
        <ConnectButton 
          showBalance={false}
          accountStatus="avatar"
          chainStatus="icon"
        />
      </div>
    </header>
  );
}
