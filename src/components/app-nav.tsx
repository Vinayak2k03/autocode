"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Settings,
} from "lucide-react";

import { app } from "@/config/app";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
];

const COMING_SOON_ITEMS = [
  { label: "Tasks", icon: ListTodo },
  { label: "Agent", icon: Bot },
];

export function AppNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Main navigation">
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-4 px-2 text-lg font-semibold tracking-tight"
      >
        {app.name}
      </Link>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
      {COMING_SOON_ITEMS.map(({ label, icon: Icon }) => (
        <span
          key={label}
          aria-disabled="true"
          title="Coming soon"
          className="flex cursor-not-allowed items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground/50"
        >
          <Icon className="h-4 w-4" />
          {label}
          <span className="ml-auto rounded-full border border-border px-1.5 py-0.5 text-[10px]">
            Soon
          </span>
        </span>
      ))}
      <div className="mt-4 border-t border-border pt-4">
        <Link
          href="/settings"
          onClick={onNavigate}
          aria-current={pathname === "/settings" ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
            pathname === "/settings"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </nav>
  );
}
