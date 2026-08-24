"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import React from "react";

interface NavLinkProps extends React.ComponentProps<typeof Link> {
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function NavLink({ href, children, icon, className, ...props }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(String(href) + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
        className
      )}
      {...props}
    >
      {icon && (
        <span className={cn("w-5 h-5 flex items-center justify-center", isActive ? "text-primary" : "")}>
          {icon}
        </span>
      )}
      {children}
    </Link>
  );
}
