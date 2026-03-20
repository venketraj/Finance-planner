"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useProfile } from "@/lib/queries/useProfile";
import { FamilyContext } from "@/lib/queries/useFamily";

interface ProtectedShellProps {
  userEmail?: string;
  children: React.ReactNode;
}

export function ProtectedShell({ userEmail, children }: ProtectedShellProps) {
  const [collapsed, setCollapsed]         = useState(false);
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);

  const { data: profile } = useProfile();

  return (
    <FamilyContext.Provider value={{ activeMemberId, setActiveMemberId }}>
      <div className="flex h-screen">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            userEmail={userEmail}
            fullName={profile?.full_name}
            onMenuClick={() => setMobileOpen((o) => !o)}
          />
          <main className="flex-1 overflow-y-auto bg-muted/50">{children}</main>
        </div>
      </div>
    </FamilyContext.Provider>
  );
}
