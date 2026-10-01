import { OtpCarrier } from "@prisma/client";
import { sendEmail, otpEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";

/**
 * A "carrier" is the delivery channel a one-time code travels over. Each
 * carrier owns three concerns so the login flow can treat them uniformly:
 *
 *   - `isConfigured()`  — is a backend transport wired up at all?
 *   - `destinationFor()` — which address on the user record this carrier uses
 *   - `deliver()`        — hand the code to the transport
 *
 * Availability is therefore a function of both the server environment and the
 * user's own record (e.g. SMS needs a phone number on file), which is what
 * drives the picker shown after the password step.
 */

export interface CarrierTransport {
  id: OtpCarrier;
  label: string;
  description: string;
  isConfigured(): boolean;
  destinationFor(user: { email: string; phone: string | null }): string | null;
  deliver(input: {
    destination: string;
    code: string;
    name: string;
    expiresInMinutes: number;
  }): Promise<{ ok: boolean; error?: string }>;
}

const emailTransport: CarrierTransport = {
  id: OtpCarrier.EMAIL,
  label: "Email",
  description: "Send a code to your account email address",

  isConfigured() {
    // Report the transport honestly. `sendEmail` logs instead of sending when
    // Resend is absent in development, and reports a hard failure in
    // production; claiming `true` unconditionally would offer the user an
    // Email option that can never deliver in a misconfigured deployment.
    return process.env.NODE_ENV !== "production" || Boolean(process.env.RESEND_API_KEY);
  },

  destinationFor(user) {
    return user.email || null;
  },

  async deliver({ destination, code, name, expiresInMinutes }) {
    const { subject, html, text } = otpEmail({ name, code, expiresInMinutes });
    // `sendEmail` decides whether an absent Resend key is fatal: it reports a
    // hard failure in production, and simulated console delivery in development.
    return sendEmail({ to: destination, subject, html, text });
  },
};

const smsTransport: CarrierTransport = {
  id: OtpCarrier.SMS,
  label: "Text message",
  description: "Send a code to the mobile number on your profile",

  isConfigured() {
    return Boolean(process.env.SMS_ACCOUNT_SID && process.env.SMS_AUTH_TOKEN && process.env.SMS_FROM);
  },

  destinationFor(user) {
    const phone = user.phone?.trim();
    return phone ? phone : null;
  },

  async deliver({ destination, code, name, expiresInMinutes }) {
    return sendSms({
      to: destination,
      body: `${code} is your UpJob verification code. It expires in ${expiresInMinutes} minutes. If this wasn't you, ignore this message.`,
      name,
    });
  },
};

export const CARRIERS: Record<OtpCarrier, CarrierTransport> = {
  [OtpCarrier.EMAIL]: emailTransport,
  [OtpCarrier.SMS]: smsTransport,
};

export function getCarrier(id: OtpCarrier): CarrierTransport {
  return CARRIERS[id];
}

export interface AvailableCarrier {
  id: OtpCarrier;
  label: string;
  description: string;
  /** Masked so the response never echoes the full address. */
  destination: string;
  preferred: boolean;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const head = local.slice(0, 1);
  const tail = local.length > 2 ? local.slice(-1) : "";
  return `${head}${"*".repeat(Math.max(local.length - 1 - tail.length, 1))}${tail}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "*".repeat(digits.length);
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

export function maskDestination(carrier: OtpCarrier, destination: string): string {
  return carrier === OtpCarrier.SMS ? maskPhone(destination) : maskEmail(destination);
}

/**
 * Carriers this user can actually receive a code on right now, most-preferred
 * first. A carrier that is unconfigured server-side or missing a destination
 * on the user record is simply omitted, so the picker never offers a dead end.
 */
export function availableCarriers(
  user: { email: string; phone: string | null },
  preferredCarrier: OtpCarrier | null = null,
): AvailableCarrier[] {
  return (Object.values(CARRIERS) as CarrierTransport[])
    .map((carrier) => {
      const destination = carrier.destinationFor(user);
      if (!destination) return null;
      if (!carrier.isConfigured()) return null;
      return {
        id: carrier.id,
        label: carrier.label,
        description: carrier.description,
        destination: maskDestination(carrier.id, destination),
        preferred: carrier.id === preferredCarrier,
      } satisfies AvailableCarrier;
    })
    .filter((c): c is AvailableCarrier => c !== null)
    .sort((a, b) => Number(b.preferred) - Number(a.preferred));
}
