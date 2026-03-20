"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  Flame,
  Settings,
  Landmark,
  CreditCard,
  ArrowLeftRight,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  X,
  Search,
  Bookmark,
  SlidersHorizontal,
} from "lucide-react";
import { useEvaluateAlerts } from "@/lib/queries/useAlerts";

const navItems = [
  { href: "/protected/dashboard",    label: "Dashboard",       icon: LayoutDashboard  },
  { href: "/protected/transactions", label: "Transactions",    icon: ArrowLeftRight   },
  { href: "/protected/portfolio",    label: "Portfolio",       icon: Briefcase        },
  { href: "/protected/debts",        label: "Debts",           icon: CreditCard       },
  { href: "/protected/fire",         label: "FIRE Calculator", icon: Flame            },
  { href: "/protected/search",       label: "Search",          icon: Search           },
  { href: "/protected/watchlist",    label: "Watchlist",       icon: Bookmark         },
  { href: "/protected/screener",     label: "Screener",        icon: SlidersHorizontal },
  { href: "/protected/alerts",       label: "Alerts",          icon: Bell             },
  { href: "/protected/settings",     label: "Settings",        icon: Settings         },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { data: evaluation } = useEvaluateAlerts();
  const alertCount = evaluation?.triggered_count ?? 0;

  const navContent = (
    <>
      <div className={cn(
        "flex h-16 items-center border-b",
        collapsed ? "justify-center px-0" : "justify-between px-4"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary shrink-0" />
            <span className="text-base font-bold whitespace-nowrap">FinancePlanner</span>
          </div>
        )}
        {collapsed && <Landmark className="h-5 w-5 text-primary" />}

        <button
          onClick={onToggleCollapse}
          className="hidden md:flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>

        <button
          onClick={onCloseMobile}
          className="md:hidden flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive  = pathname === item.href || pathname.startsWith(item.href + "/");
          const isAlerts  = item.href === "/protected/alerts";
          const showBadge = isAlerts && alertCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center" : "gap-3",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="relative shrink-0">
                <item.icon className="h-4 w-4" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                )}
              </div>
              {!collapsed && <span className="flex-1 whitespace-nowrap">{item.label}</span>}
              {!collapsed && showBadge && (
                <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      <aside className={cn(
        "hidden md:flex flex-col border-r bg-card transition-all duration-200",
        collapsed ? "w-14" : "w-56"
      )}>
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile} />
          <aside className="absolute left-0 top-0 h-full w-56 flex flex-col border-r bg-card z-50">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
