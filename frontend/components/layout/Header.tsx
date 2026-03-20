"use client";

import { Menu } from "lucide-react";
import { UserMenu } from "@/components/layout/UserMenu";
import { FamilySwitcher } from "@/components/layout/FamilySwitcher";

interface HeaderProps {
  userEmail?: string;
  fullName?: string | null;
  onMenuClick: () => void;
}

export function Header({ userEmail, fullName, onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 gap-3">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="md:hidden flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      {/* Family member switcher */}
      <FamilySwitcher userFullName={fullName} />

      <UserMenu userEmail={userEmail} fullName={fullName} />
    </header>
  );
}
