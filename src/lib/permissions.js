// Who can do what inside a household. Shared by server checks and UI (to hide buttons),
// but the server check is the one that actually protects data.
const PERMISSIONS = {
  "household:read": ["owner", "editor", "viewer"],
  "finance:write": ["owner", "editor"], // expenses, recurring items, goals, categories
  "members:manage": ["owner"], // invite / remove members, change roles
  "household:manage": ["owner"], // settings, delete household
};

export function can(role, permission) {
  return PERMISSIONS[permission]?.includes(role) ?? false;
}

export const ROLE_LABELS = { owner: "Owner", editor: "Editor", viewer: "Viewer" };
