import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/types";

export const SESSION_COOKIE = "upjob_session";

const authSecret = process.env.AUTH_SECRET;
if (!authSecret) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET environment variable is required in production");
  }
}
const secret = new TextEncoder().encode(authSecret || "dev-only-insecure-secret-change-me");

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

function toClientRole(role: Role): UserRole {
  switch (role) {
    case Role.EMPLOYER:
      return "employer";
    case Role.ADMIN:
      return "admin";
    default:
      return "candidate";
  }
}

function toPrismaRole(role: UserRole): Role {
  switch (role) {
    case "employer":
      return Role.EMPLOYER;
    case "admin":
      return Role.ADMIN;
    default:
      return Role.CANDIDATE;
  }
}

export async function createSession(user: { id: string; role: UserRole }): Promise<void> {
  const cookieStore = await cookies();
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const id = await getSessionUserId();
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name, role: toClientRole(user.role) };
}

export { toClientRole, toPrismaRole };