"use client";

import { useState, useRef, useEffect } from "react";
import { Users, UserPlus, Trash2, Check, ChevronDown } from "lucide-react";
import {
  useFamilyMembers,
  useCreateFamilyMember,
  useDeleteFamilyMember,
  useActiveMember,
  type FamilyMember,
} from "@/lib/queries/useFamily";

const COLORS = [
  "bg-violet-600", "bg-blue-600", "bg-emerald-600",
  "bg-rose-600",   "bg-amber-600", "bg-cyan-600",
];
const RELATIONS = ["spouse", "child", "parent", "sibling", "other"];

function Avatar({ name, color, size = "sm" }: { name: string; color: string; size?: "sm" | "xs" }) {
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const cls = size === "xs" ? "h-5 w-5 text-[9px]" : "h-7 w-7 text-xs";
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 ${color} ${cls}`}>
      {initials}
    </span>
  );
}

export function FamilySwitcher({ userFullName }: { userFullName?: string | null }) {
  const { data: members = [] } = useFamilyMembers();
  const { activeMemberId, setActiveMemberId } = useActiveMember();
  const createMember = useCreateFamilyMember();
  const deleteMember = useDeleteFamilyMember();

  const [open, setOpen]       = useState(false);
  const [adding, setAdding]   = useState(false);
  const [newName, setNewName] = useState("");
  const [newRel,  setNewRel]  = useState("spouse");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeLabel = activeMemberId
    ? members.find((m) => m.id === activeMemberId)?.name ?? "Member"
    : userFullName?.split(" ")[0] ?? "Me";

  const activeMember = activeMemberId ? members.find((m) => m.id === activeMemberId) : null;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await createMember.mutateAsync({ name: newName.trim(), relation: newRel, color: newColor });
    setNewName(""); setAdding(false);
  }

  if (members.length === 0 && !adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
        title="Add family member"
      >
        <Users className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Family</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
      >
        {activeMember
          ? <Avatar name={activeMember.name} color={activeMember.color} size="xs" />
          : <Users className="h-4 w-4 text-muted-foreground" />}
        <span className="hidden sm:inline text-sm font-medium">{activeLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-60 rounded-xl border bg-card shadow-lg py-1">
          <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">View as</p>

          {/* Primary user */}
          <button
            onClick={() => { setActiveMemberId(null); setOpen(false); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shrink-0">
              {(userFullName ?? "M")[0].toUpperCase()}
            </div>
            <span className="flex-1 text-left">{userFullName ?? "Me"} <span className="text-xs text-muted-foreground">(primary)</span></span>
            {!activeMemberId && <Check className="h-3.5 w-3.5 text-primary" />}
          </button>

          {/* Family members */}
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors group">
              <button
                onClick={() => { setActiveMemberId(m.id); setOpen(false); }}
                className="flex flex-1 items-center gap-2.5 text-sm"
              >
                <Avatar name={m.name} color={m.color} size="xs" />
                <span className="flex-1 text-left">{m.name} <span className="text-xs text-muted-foreground capitalize">({m.relation})</span></span>
                {activeMemberId === m.id && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
              <button
                onClick={() => deleteMember.mutate(m.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <div className="border-t mt-1 pt-1">
            {adding ? (
              <form onSubmit={handleAdd} className="px-3 py-2 space-y-2">
                <input
                  autoFocus
                  placeholder="Name (e.g. Priya)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-md border bg-background px-2 py-1 text-xs"
                />
                <div className="flex gap-2">
                  <select
                    value={newRel}
                    onChange={(e) => setNewRel(e.target.value)}
                    className="flex-1 rounded-md border bg-background px-2 py-1 text-xs"
                  >
                    {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="flex gap-1">
                    {COLORS.map((c) => (
                      <button
                        key={c} type="button"
                        onClick={() => setNewColor(c)}
                        className={`h-4 w-4 rounded-full ${c} ${newColor === c ? "ring-2 ring-offset-1 ring-primary" : ""}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 rounded bg-primary py-1 text-xs font-medium text-primary-foreground">
                    Add
                  </button>
                  <button type="button" onClick={() => setAdding(false)} className="flex-1 rounded border py-1 text-xs">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" /> Add family member
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
