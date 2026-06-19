"use client";

/**
 * Audit Planning — Resources (S1).
 *
 * Multi-team port of HTML screen-1 (`s1Teams`, `s1RenderAll`, `_s1NewTeam`,
 * `_s1BuildMemberRow`, `S1_ROLE_DEFS`, `S1_AREAS` — see the HTML demo for
 * the canonical behaviour).
 *
 * Data shape lives in `lib/types.ts` (`S1State`, `TeamRecord`, `TeamMember`)
 * and is persisted on `client.s1` via `useFirmStore.updateActiveS1`. Each
 * patch is also persisted to Dexie by the store, so auto-save is implicit
 * — every input change goes through `mutate()` which calls the store.
 *
 * Validation rule: at least ONE team must have ≥1 named Partner + ≥1
 * named Senior. On failure we mark the first non-qualifying team's
 * inline error slot, scroll to it, and flash-pulse it via useFlashElement.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirmStore } from "@/lib/store/firmStore";
import { Banner } from "@/components/layout/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { S1_AREAS, S1_ROLE_DEFS, type S1RoleDef } from "@/lib/constants";
import { useFlashElement } from "@/lib/utils/flash";
import { uid } from "@/lib/utils";
import type { S1State, TeamMember, TeamRecord } from "@/lib/types";

type RoleKey = S1RoleDef["key"];

// ----- Helpers ------------------------------------------------------------

function emptyMembers(): TeamRecord["members"] {
  return { partner: [], manager: [], senior: [], associate: [] };
}

function newTeam(name = "Team"): TeamRecord {
  return {
    id: uid("team"),
    name,
    members: emptyMembers(),
  };
}

function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name || "?").slice(0, 2).toUpperCase();
}

function namedCount(members: TeamMember[]): number {
  return members.filter((m) => m.name.trim()).length;
}

/** A team qualifies if it has ≥1 named Partner AND ≥1 named Senior. */
function isQualifyingTeam(t: TeamRecord): boolean {
  return namedCount(t.members.partner) >= 1 && namedCount(t.members.senior) >= 1;
}

function totalMembers(t: TeamRecord): number {
  return S1_ROLE_DEFS.reduce((a, r) => a + t.members[r.key].length, 0);
}

/** Build the dom id used by `useFlashElement` for a given team. */
function teamElId(teamId: string): string {
  return `s1-team-${teamId}`;
}

// ----- Page ----------------------------------------------------------------

export default function ResourcesPage() {
  const router = useRouter();
  const clients = useFirmStore((s) => s.clients);
  const activeClientId = useFirmStore((s) => s.activeClientId);
  const updateActiveS1 = useFirmStore((s) => s.updateActiveS1);
  const active = clients.find((c) => c.id === activeClientId) ?? null;
  const flash = useFlashElement();

  const [submitMsg, setSubmitMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pendingTeamDelete, setPendingTeamDelete] = useState<TeamRecord | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // When the user clicks Continue with an invalid form we set this so the
  // inline error renders. Cleared on any successful mutation.
  const [showErrors, setShowErrors] = useState(false);

  // Derive a stable working S1State. Brand-new clients get the default
  // "Lead Engagement Team" seeded the first time they touch this page.
  const teams: TeamRecord[] = useMemo(() => {
    if (!active) return [];
    const stored = active.s1;
    if (stored && Array.isArray(stored.teams) && stored.teams.length) {
      return stored.teams;
    }
    return [newTeam("Lead Engagement Team")];
  }, [active]);

  // Seed default team on first visit so the page is never empty. The render
  // already uses the in-memo team array; this effect just persists it to
  // Dexie so a reload doesn't lose the seeded team.
  useEffect(() => {
    if (!active) return;
    const stored = active.s1;
    if (stored && Array.isArray(stored.teams) && stored.teams.length > 0) return;
    void updateActiveS1({ teams });
    // We only want this to fire when the active client changes / has no s1 yet;
    // `teams` is derived from `active` via useMemo so it's stable across renders
    // with the same active client.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  // ----- Mutators ---------------------------------------------------------
  // Each mutator re-builds the teams array and persists via the store.
  // `setShowErrors(false)` clears the "show errors" UX state on any edit so
  // the user gets immediate feedback when fixing problems.
  const mutate = (next: TeamRecord[]) => {
    const state: S1State = { teams: next };
    void updateActiveS1(state);
    if (submitMsg) setSubmitMsg(null);
    if (showErrors) setShowErrors(false);
  };

  const addTeam = () => {
    mutate([...teams, newTeam(`Team ${teams.length + 1}`)]);
  };

  const removeTeam = (teamId: string) => {
    if (teams.length <= 1) return;
    mutate(teams.filter((t) => t.id !== teamId));
  };

  const renameTeam = (teamId: string, name: string) => {
    mutate(teams.map((t) => (t.id === teamId ? { ...t, name } : t)));
  };

  const toggleCollapsed = (teamId: string) => {
    setCollapsed((c) => ({ ...c, [teamId]: !c[teamId] }));
  };

  /**
   * Apply an immutable update to a single role's member list inside a single
   * team. Centralises the deep-clone pattern so the role-key spread doesn't
   * widen the `TeamRecord["members"]` type at every call site.
   */
  const patchRole = (
    teamId: string,
    role: RoleKey,
    fn: (members: TeamMember[]) => TeamMember[]
  ): TeamRecord[] =>
    teams.map((t) => {
      if (t.id !== teamId) return t;
      const nextMembers: TeamRecord["members"] = { ...t.members };
      nextMembers[role] = fn(t.members[role]);
      return { ...t, members: nextMembers };
    });

  const addMember = (teamId: string, role: RoleKey) => {
    const member: TeamMember = { id: uid("mbr"), name: "", areas: [] };
    mutate(patchRole(teamId, role, (list) => [...list, member]));
    // Focus the new input once it mounts. Small delay lets React commit.
    window.setTimeout(() => {
      document.getElementById(`inp-${member.id}`)?.focus();
    }, 60);
  };

  const removeMember = (teamId: string, role: RoleKey, memberId: string) => {
    mutate(patchRole(teamId, role, (list) => list.filter((m) => m.id !== memberId)));
  };

  const renameMember = (teamId: string, role: RoleKey, memberId: string, name: string) => {
    mutate(
      patchRole(teamId, role, (list) => list.map((m) => (m.id === memberId ? { ...m, name } : m)))
    );
  };

  const toggleArea = (teamId: string, role: RoleKey, memberId: string, area: string) => {
    mutate(
      patchRole(teamId, role, (list) =>
        list.map((m) => {
          if (m.id !== memberId) return m;
          const has = m.areas.includes(area);
          return {
            ...m,
            areas: has ? m.areas.filter((a) => a !== area) : [...m.areas, area],
          };
        })
      )
    );
  };

  // ----- Derived summary counts -------------------------------------------
  const summary = useMemo(() => {
    const counts: Record<RoleKey, number> = { partner: 0, manager: 0, senior: 0, associate: 0 };
    let total = 0;
    let named = 0;
    teams.forEach((t) => {
      S1_ROLE_DEFS.forEach((r) => {
        const list = t.members[r.key];
        counts[r.key] += list.length;
        total += list.length;
        named += namedCount(list);
      });
    });
    return { counts, total, named };
  }, [teams]);

  const qualifyingTeam = useMemo(() => teams.find(isQualifyingTeam), [teams]);
  const firstInvalidTeam = useMemo(
    () => (qualifyingTeam ? null : teams.find((t) => !isQualifyingTeam(t)) ?? teams[0]),
    [qualifyingTeam, teams]
  );

  // ----- Validation / Continue --------------------------------------------
  const onContinue = () => {
    if (!active) return;
    if (!qualifyingTeam) {
      setShowErrors(true);
      const target = firstInvalidTeam;
      setSubmitMsg({
        kind: "err",
        text:
          summary.total === 0
            ? "Add at least 1 Partner & 1 Senior to a team to continue"
            : "At least one team must have ≥1 named Partner + ≥1 named Senior",
      });
      if (target) {
        window.setTimeout(() => flash(teamElId(target.id)), 0);
      }
      return;
    }
    setSubmitMsg({
      kind: "ok",
      text: `Resources saved ✓ — ${summary.named} member${summary.named === 1 ? "" : "s"} named across ${teams.length} team${teams.length === 1 ? "" : "s"}`,
    });
    router.push("/planning/timelines");
  };

  // ----- Empty state ------------------------------------------------------
  if (!active) {
    return (
      <div>
        <Banner
          title="Audit Planning — Resources Involved"
          subtitle="Multi-team Partner / Manager / Senior / Associate hierarchy with responsibility areas"
        />
        <Card>
          <CardContent>
            <div className="text-center py-10 text-sm text-gray-600">
              <div className="text-2xl mb-2">👈</div>
              <div className="font-medium mb-1">No active client</div>
              <div className="mb-4">Add or select a client first to begin assigning resources.</div>
              <Button size="sm" onClick={() => router.push("/clients")}>
                Go to Clients
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Banner
        title="Audit Planning — Resources Involved"
        subtitle="SA 220 · One team per audit firm / branch — at least one team must have ≥1 Partner + ≥1 Senior"
        chips={[
          active.profile.currentFy
            ? { label: `📅 ${active.profile.currentFy}`, tone: "blue" }
            : { label: "📅 FY —", tone: "amber" },
          qualifyingTeam
            ? { label: "✓ Team Composition Valid", tone: "green" }
            : { label: "⏳ Incomplete", tone: "amber" },
          { label: `${summary.total} Member${summary.total === 1 ? "" : "s"}`, tone: "blue" },
        ]}
      />

      {/* SA 220 info tip */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900 mb-5 flex gap-2">
        <span>💡</span>
        <span>
          <strong>Multi-team model.</strong> Joint audits, branch audits and multi-firm engagements need more than one
          engagement team. Each team has its own Partner / Manager / Senior / Associate roster, and each member can
          own one or more responsibility areas (PPE, Receivables, IT/ITGC, EQR, etc.). Validation requires at least
          <em> one </em> team to have ≥1 named Partner + ≥1 named Senior.
        </span>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <SummaryCard label="Total Members" value={summary.total} tone="text-gray-900" />
        <SummaryCard label="Partner" value={summary.counts.partner} tone="text-amber-600" />
        <SummaryCard label="Manager" value={summary.counts.manager} tone="text-blue-600" />
        <SummaryCard label="Senior" value={summary.counts.senior} tone="text-emerald-600" />
        <SummaryCard label="Associate" value={summary.counts.associate} tone="text-violet-600" />
      </div>

      {/* Teams card */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">👥</span>
            <div>
              <CardTitle>Engagement Teams</CardTitle>
              <CardDescription>
                Add one team per audit firm / branch · Roles within each team: Partner / Manager / Senior / Associate
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={addTeam}>
            + Add Team
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teams.map((team) => (
              <TeamBlock
                key={team.id}
                team={team}
                collapsed={!!collapsed[team.id]}
                onToggleCollapsed={() => toggleCollapsed(team.id)}
                onRename={(name) => renameTeam(team.id, name)}
                onRemove={() => setPendingTeamDelete(team)}
                canRemove={teams.length > 1}
                onAddMember={(role) => addMember(team.id, role)}
                onRemoveMember={(role, memberId) => removeMember(team.id, role, memberId)}
                onRenameMember={(role, memberId, name) => renameMember(team.id, role, memberId, name)}
                onToggleArea={(role, memberId, area) => toggleArea(team.id, role, memberId, area)}
                showError={showErrors && !isQualifyingTeam(team) && !qualifyingTeam}
              />
            ))}
          </div>

          {/* Prominent "+ Add Another Team" CTA — primary affordance, mirrors
              HTML demo's discoverability fix (the tiny header button is secondary). */}
          <button
            type="button"
            onClick={addTeam}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-400 rounded-lg text-blue-700 text-sm font-semibold transition-colors"
          >
            <span className="text-lg leading-none">＋</span>
            Add Another Team
            <span className="text-[11px] font-medium text-blue-500 ml-1">
              (joint audit · branch · IT specialist · etc.)
            </span>
          </button>
        </CardContent>
      </Card>

      {/* Footer / continue bar */}
      <div className="flex items-center justify-between bg-white border border-border rounded-lg px-4 py-3 sticky bottom-2 shadow-sm">
        <div className="text-xs">
          {submitMsg ? (
            <span className={submitMsg.kind === "ok" ? "text-green-700" : "text-red-700"}>{submitMsg.text}</span>
          ) : qualifyingTeam ? (
            <span className="text-gray-600">
              {summary.named} of {summary.total} member{summary.total === 1 ? "" : "s"} named across {teams.length}{" "}
              team{teams.length === 1 ? "" : "s"} · ✓ &ldquo;{qualifyingTeam.name || "Team"}&rdquo; satisfies Partner +
              Senior requirement
            </span>
          ) : summary.total === 0 ? (
            <span className="text-gray-600">
              No team members added — at least one team needs ≥1 Partner & ≥1 Senior
            </span>
          ) : (
            <span className="text-gray-600">
              {summary.named} of {summary.total} named across {teams.length} team{teams.length === 1 ? "" : "s"} — no
              team has ≥1 Partner AND ≥1 Senior yet
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push("/planning/engagement-acceptance")}>
            ← Back to Engagement Acceptance
          </Button>
          <Button size="sm" onClick={onContinue}>
            Save & Continue to Estimated Timelines →
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingTeamDelete}
        title={`Remove team "${pendingTeamDelete?.name || ""}"?`}
        description="All members assigned to this team — including their responsibility areas — will be lost. This cannot be undone."
        confirmText="Remove team"
        destructive
        onCancel={() => setPendingTeamDelete(null)}
        onConfirm={() => {
          if (pendingTeamDelete) removeTeam(pendingTeamDelete.id);
          setPendingTeamDelete(null);
        }}
      />
    </div>
  );
}

// ----- Subcomponents -------------------------------------------------------

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card>
      <CardContent className="text-center">
        <div className={`text-2xl font-bold ${tone}`}>{value}</div>
        <div className="text-[11px] text-gray-500 uppercase tracking-wide mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

interface TeamBlockProps {
  team: TeamRecord;
  collapsed: boolean;
  showError: boolean;
  canRemove: boolean;
  onToggleCollapsed: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onAddMember: (role: RoleKey) => void;
  onRemoveMember: (role: RoleKey, memberId: string) => void;
  onRenameMember: (role: RoleKey, memberId: string, name: string) => void;
  onToggleArea: (role: RoleKey, memberId: string, area: string) => void;
}

function TeamBlock({
  team,
  collapsed,
  showError,
  canRemove,
  onToggleCollapsed,
  onRename,
  onRemove,
  onAddMember,
  onRemoveMember,
  onRenameMember,
  onToggleArea,
}: TeamBlockProps) {
  const total = totalMembers(team);
  const nameInvalid = showError; // when a team fails the team-level error, hint its name input

  return (
    <div id={teamElId(team.id)} className="border border-border rounded-lg bg-white overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-border">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="text-gray-500 hover:text-gray-700 px-1"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "▸" : "▾"}
        </button>
        <input
          type="text"
          value={team.name}
          onChange={(e) => onRename(e.target.value)}
          placeholder="Team name (e.g. Mumbai Branch Team)"
          className={`flex-1 text-sm font-semibold bg-transparent border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring focus:bg-white focus:border-transparent ${
            nameInvalid ? "border-red-500" : "border-transparent hover:border-gray-300"
          }`}
        />
        <span className="text-[11px] font-semibold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
          {total} member{total === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          title={canRemove ? "Remove team" : "At least one team is required"}
          className="w-6 h-6 rounded-full border border-gray-200 bg-white text-gray-500 flex items-center justify-center text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500 disabled:hover:border-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="p-4 space-y-4">
          {S1_ROLE_DEFS.map((role) => (
            <RoleBlock
              key={role.key}
              role={role}
              members={team.members[role.key]}
              onAdd={() => onAddMember(role.key)}
              onRemoveMember={(memberId) => onRemoveMember(role.key, memberId)}
              onRenameMember={(memberId, name) => onRenameMember(role.key, memberId, name)}
              onToggleArea={(memberId, area) => onToggleArea(role.key, memberId, area)}
            />
          ))}
          {showError && (
            <div className="text-xs text-red-600 font-semibold mt-1">
              At least one team must have ≥1 named Partner + ≥1 named Senior
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface RoleBlockProps {
  role: S1RoleDef;
  members: TeamMember[];
  onAdd: () => void;
  onRemoveMember: (memberId: string) => void;
  onRenameMember: (memberId: string, name: string) => void;
  onToggleArea: (memberId: string, area: string) => void;
}

function RoleBlock({ role, members, onAdd, onRemoveMember, onRenameMember, onToggleArea }: RoleBlockProps) {
  return (
    <div>
      {/* Role header */}
      <div
        className={`flex items-center justify-between gap-3 pl-3 mb-2 border-l-4 ${role.borderClass}`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full text-white font-extrabold text-xs flex items-center justify-center"
            style={{ background: role.color }}
          >
            {role.icon}
          </div>
          <div>
            <div className={`text-[13px] font-bold ${role.textClass}`}>{role.label}</div>
            <div className="text-[10.5px] text-gray-500">{role.desc}</div>
          </div>
        </div>
        <span
          className={`text-[11px] font-semibold bg-gray-50 px-2.5 py-0.5 rounded-full ${role.textClass}`}
        >
          {members.length} member{members.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Member rows */}
      <div className="space-y-1.5">
        {members.map((m, idx) => (
          <MemberRow
            key={m.id}
            index={idx}
            member={m}
            role={role}
            onRemove={() => onRemoveMember(m.id)}
            onRename={(name) => onRenameMember(m.id, name)}
            onToggleArea={(area) => onToggleArea(m.id, area)}
          />
        ))}
      </div>

      {/* Add-member button */}
      <button
        type="button"
        onClick={onAdd}
        className={`mt-1.5 w-full flex items-center gap-2.5 px-3 py-1.5 bg-transparent border border-dashed rounded-lg text-xs font-semibold ${role.textClass} ${role.ringClass} hover:bg-gray-50`}
      >
        <span
          className="w-5 h-5 rounded-full text-white font-bold text-xs flex items-center justify-center"
          style={{ background: role.color }}
        >
          +
        </span>
        Add {role.label}
      </button>
    </div>
  );
}

interface MemberRowProps {
  index: number;
  member: TeamMember;
  role: S1RoleDef;
  onRemove: () => void;
  onRename: (name: string) => void;
  onToggleArea: (area: string) => void;
}

function MemberRow({ index, member, role, onRemove, onRename, onToggleArea }: MemberRowProps) {
  const initials = member.name ? getInitials(member.name) : "?";
  const avatarColor = member.name ? role.color : "#CBD5E1";

  return (
    <div className="flex flex-col gap-2 px-3 py-2 bg-white border border-border rounded-lg">
      <div className="flex items-center gap-2.5">
        <div className="text-[11px] font-bold text-gray-400 w-4 font-mono">{index + 1}</div>
        <div
          className="w-7 h-7 rounded-full text-white font-extrabold text-[11px] flex items-center justify-center flex-shrink-0"
          style={{ background: avatarColor }}
        >
          {initials}
        </div>
        <input
          type="text"
          id={`inp-${member.id}`}
          value={member.name}
          onChange={(e) => onRename(e.target.value)}
          placeholder="Member name (e.g. R. Mehta)"
          className="flex-1 px-2.5 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
        <button
          type="button"
          onClick={onRemove}
          title="Remove member"
          className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs flex-shrink-0 hover:bg-red-50 hover:text-red-600"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 pl-8">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-1">Areas:</span>
        {S1_AREAS.map((area) => {
          const active = member.areas.includes(area);
          return (
            <button
              type="button"
              key={area}
              onClick={() => onToggleArea(area)}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-colors"
              style={{
                background: active ? role.color : "#fff",
                color: active ? "#fff" : "#475569",
                borderColor: active ? role.color : "#E2E8F0",
              }}
            >
              {area}
            </button>
          );
        })}
      </div>
    </div>
  );
}
