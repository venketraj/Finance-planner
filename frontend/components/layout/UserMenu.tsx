"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, Settings, LogOut } from "lucide-react";
import { ProfileModal } from "@/components/layout/ProfileModal";

interface UserMenuProps {
  userEmail?: string;
  fullName?: string | null;
}

function getInitials(fullName?: string | null, email?: string): string {
  if (fullName) {
    return fullName
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email?.[0]?.toUpperCase() ?? "U";
}

// Deterministic avatar colour from the user's name/email
const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-violet-600",
  "bg-emerald-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-cyan-600",
  "bg-pink-600",
];

function avatarColor(seed?: string): string {
  if (!seed) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function UserMenu({ userEmail, fullName }: UserMenuProps) {
  const [open, setOpen]               = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router  = useRouter();

  const initials = getInitials(fullName, userEmail);
  const color    = avatarColor(fullName || userEmail);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        {/* Avatar button */}
        <button
          onClick={() => setOpen((o) => !o)}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white transition-opacity hover:opacity-90 ${color}`}
          title={fullName || userEmail}
          aria-label="User menu"
        >
          {initials}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border bg-card shadow-lg py-1">
            {/* User info header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${color}`}>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {fullName || userEmail?.split("@")[0] || "User"}
                </p>
                {userEmail && (
                  <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                )}
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                onClick={() => { setOpen(false); setShowProfile(true); }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                My Profile
              </button>

              <button
                onClick={() => { setOpen(false); router.push("/protected/settings"); }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Settings
              </button>
            </div>

            <div className="border-t py-1">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile slide-over */}
      {showProfile && (
        <ProfileModal
          onClose={() => setShowProfile(false)}
          userEmail={userEmail}
        />
      )}
    </>
  );
}
