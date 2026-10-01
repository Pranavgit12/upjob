import { Role } from "@prisma/client";
import type { UserRole } from "@/types";

/**
 * Decides whether a password-verified login must also clear a one-time-code
 * challenge before a session cookie is issued.
 *
 * Rollout is controlled by env rather than hard-coded so MFA can be turned on
 * for a staging environment before it is forced on real logins:
 *
 *   OTP_MODE=required  every user with a usable carrier is challenged (default)
 *   OTP_MODE=optional  only users who opted in via `User.mfaEnabled`
 *   OTP_MODE=off       never challenge
 *
 * With no authenticator-app factor in play there is no lost-secret lockout:
 * email is always offered as a carrier, and an SMS user can fall back to it.
 */
export type OtpMode = "required" | "optional" | "off";

export function otpMode(): OtpMode {
  const raw = (process.env.OTP_MODE || "required").trim().toLowerCase();
  if (raw === "off" || raw === "disabled" || raw === "false") return "off";
  if (raw === "optional") return "optional";
  return "required";
}

export function shouldChallengeForOtp(user: { mfaEnabled: boolean; role: Role }): boolean {
  const mode = otpMode();
  if (mode === "off") return false;
  if (mode === "required") {
    // An operator with no reachable carrier would be locked out of the admin
    // panel, so always let admins through — they are seeded manually and are the
    // recovery path if the mail transport dies.
    if (user.role === Role.ADMIN) return false;
    return true;
  }
  return user.mfaEnabled;
}

export type { UserRole };
