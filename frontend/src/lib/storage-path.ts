/**
 * Storage path utilities for resume files.
 * Company and roleId come from the fetch-job API (roleStore).
 */

function sanitizePathSegment(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "unknown";
}

/** "John Doe" -> "John_Doe_Resume.tex" */
export function buildResumeFileName(userName: string | null | undefined): string {
  if (!userName?.trim()) return "resume.tex";
  const parts = userName.trim().split(/\s+/);
  const first = parts[0] ?? "First";
  const last = parts.slice(1).join(" ") || "Last";
  const slug = [first, last].map((s) => sanitizePathSegment(s)).join("_");
  return `${slug}_Resume.tex`;
}

/** user_id/company/role_id/First_Last_Resume.tex */
export function buildRolesStoragePath(
  userId: string,
  company: string,
  roleId: string,
  fileName?: string,
): string {
  const fn = fileName ?? "resume.tex";
  return `${userId}/${sanitizePathSegment(company)}/${sanitizePathSegment(roleId)}/${fn}`;
}
