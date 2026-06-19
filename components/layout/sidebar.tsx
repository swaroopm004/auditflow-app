"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFirmStore } from "@/lib/store/firmStore";
import { cn } from "@/lib/utils";
import { EXEC_FS_LABELS, EXEC_REGISTRY } from "@/lib/execution/defaults";
import type { FsId } from "@/lib/types";

const PLANNING_NAV = [
  { href: "/clients", label: "Clients", icon: "🏢" },
  { href: "/planning/engagement-acceptance", label: "Engagement Acceptance", icon: "📜" },
  { href: "/planning/resources", label: "Resources", icon: "👥" },
  { href: "/planning/timelines", label: "Timelines", icon: "📅" },
  { href: "/planning/artifacts", label: "Planning Artifacts", icon: "🧰" },
  { href: "/planning/gl-items", label: "GL Line Items", icon: "📒" },
];

const EXEC_FS_ORDER: FsId[] = ["bs", "pl", "cf", "eq"];
const EXEC_FS_ICONS: Record<FsId, string> = { bs: "🏦", pl: "📈", cf: "💵", eq: "⚖️" };

const REVIEW_NAV = [
  { href: "/monitoring", label: "Monitoring", icon: "◉" },
  { href: "/report", label: "Audit Report", icon: "📄" },
  { href: "/postmortem", label: "Post-mortem", icon: "🔬" },
  { href: "/tax-audit", label: "Tax Audit (Form 26)", icon: "🧾" },
];

export function Sidebar() {
  const pathname = usePathname();
  const clients = useFirmStore((s) => s.clients);
  const activeClientId = useFirmStore((s) => s.activeClientId);
  const hydrated = useFirmStore((s) => s.hydrated);
  const active = clients.find((c) => c.id === activeClientId);

  // Determine which FS sub-nav (if any) is currently expanded
  const expandedFs = EXEC_FS_ORDER.find((f) => pathname?.startsWith(`/execution/${f}`));

  return (
    <aside className="w-60 shrink-0 bg-gray-900 text-gray-100 min-h-screen flex flex-col">
      <div className="px-4 py-4 border-b border-gray-800">
        <div className="font-semibold text-sm">AuditFlow Suite</div>
        <div className="text-[11px] text-gray-400 mt-0.5">Indian Statutory + Tax Audit</div>
      </div>

      <div className="px-3 py-3 border-b border-gray-800">
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Active Client</div>
        {hydrated && active ? (
          <div className="text-sm font-medium truncate" title={active.profile.entityName}>
            {active.profile.entityName || "Untitled"}
          </div>
        ) : (
          <div className="text-sm text-gray-500">— None —</div>
        )}
        {hydrated && active?.profile.currentFy && (
          <div className="text-[11px] text-gray-400 mt-0.5">📅 {active.profile.currentFy}</div>
        )}
      </div>

      <nav className="flex-1 p-2 overflow-y-auto">
        {/* Planning group */}
        {PLANNING_NAV.map((n) => {
          const isActive = pathname === n.href || pathname?.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                isActive ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800/60"
              )}
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </Link>
          );
        })}

        {/* Divider */}
        <div className="mt-3 mb-1 px-3 text-[10px] uppercase tracking-wider text-gray-500">Execution</div>

        {/* Execution FS tabs */}
        {EXEC_FS_ORDER.map((fsId) => {
          const fsPath = `/execution/${fsId}`;
          const isFsActive = pathname === fsPath || pathname?.startsWith(fsPath + "/");
          return (
            <div key={fsId}>
              <Link
                href={fsPath}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  isFsActive ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800/60"
                )}
              >
                <span>{EXEC_FS_ICONS[fsId]}</span>
                <span>{EXEC_FS_LABELS[fsId]}</span>
              </Link>
              {/* Per-FS sub-nav, expanded only when user is inside that FS */}
              {expandedFs === fsId && (
                <div className="ml-5 mt-0.5 mb-1 border-l border-gray-800 pl-2">
                  {EXEC_REGISTRY[fsId].map((meta) => {
                    const tplPath = `${fsPath}/${meta.key}`;
                    const isTplActive = pathname === tplPath;
                    return (
                      <Link
                        key={meta.id}
                        href={tplPath}
                        className={cn(
                          "block px-2 py-1.5 rounded text-[12px] transition-colors",
                          isTplActive
                            ? "bg-gray-800 text-white"
                            : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200"
                        )}
                        title={meta.framework}
                      >
                        {meta.name}
                        {!meta.hasFullImpl && (
                          <span className="ml-1 text-[9px] text-amber-400/70">·stub</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Review & Reporting group */}
        <div className="mt-3 mb-1 px-3 text-[10px] uppercase tracking-wider text-gray-500">Review &amp; Reporting</div>
        {REVIEW_NAV.map((n) => {
          const isActive = pathname === n.href || pathname?.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                isActive ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800/60"
              )}
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 text-[11px] text-gray-500 border-t border-gray-800">
        v0.1 · Execution E1
      </div>
    </aside>
  );
}
