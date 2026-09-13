import { prisma } from "@/lib/prisma";
import { INTERN_ROLES, type InternRoleConfig } from "@/data/intern-roles";
import type { Prisma } from "@prisma/client";

const cache = new Map<string, InternRoleConfig>();

export function getInternRoleByKey(key: string): InternRoleConfig | null {
  return INTERN_ROLES.find((r) => r.key === key) ?? null;
}

export function getInternRoleByJob(title: string): InternRoleConfig | null {
  const t = title.toLowerCase();
  for (const role of INTERN_ROLES) {
    const haystack = `${role.key} ${role.title}`.toLowerCase();
    if (
      haystack.includes(t) ||
      t.includes(role.key) ||
      (t.includes("frontend") && role.key.startsWith("frontend")) ||
      (t.includes("business development") && role.key.startsWith("bde"))
    ) {
      return role;
    }
  }
  return null;
}

/** Load a role config, overlaying admin overrides stored in InterviewConfig. */
export async function loadRoleConfig(key: string): Promise<InternRoleConfig | null> {
  const base = getInternRoleByKey(key);
  if (!base) return null;
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const row = await prisma.interviewConfig.findUnique({ where: { role: key } });
    if (row && typeof row.data === "object" && !Array.isArray(row.data)) {
      const merged = { ...base, ...(row.data as Record<string, unknown>) } as InternRoleConfig;
      cache.set(key, merged);
      return merged;
    }
  } catch {
    /* DB unavailable — use defaults */
  }
  cache.set(key, base);
  return base;
}

export async function saveRoleConfig(key: string, data: Record<string, unknown>): Promise<void> {
  await prisma.interviewConfig.upsert({
    where: { role: key },
    update: { data: data as Prisma.InputJsonObject },
    create: { role: key, data: data as Prisma.InputJsonObject },
  });
  cache.delete(key);
}

export function invalidateRoleConfigCache(key: string): void {
  cache.delete(key);
}

export { INTERN_ROLES, type InternRoleConfig };