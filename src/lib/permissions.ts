// Who can do what inside a household. Shared by server checks and UI (to hide buttons),
// but the server check is the one that actually protects data.
import type { MemberRole } from "@/db/schema";

const PERMISSIONS = {
  "household:read": ["owner", "editor", "viewer"],
  "finance:write": ["owner", "editor"], // expenses, recurring items, goals, categories
  "members:manage": ["owner"], // invite / remove members, change roles
  "household:manage": ["owner"], // settings, delete household
} satisfies Record<string, readonly MemberRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: MemberRole | null | undefined, permission: Permission): boolean {
  const allowed: readonly MemberRole[] = PERMISSIONS[permission] ?? [];
  return role ? allowed.includes(role) : false;
}
