import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How UpJob collects, uses and protects your personal data.",
};

const SECTIONS = [
  {
    title: "1. What we collect",
    body: "We collect the information you provide when creating a profile and applying to jobs — including your name, email, phone number, location, education, work history, skills and uploaded resume. We also collect limited usage data (pages visited, actions taken) to improve the platform.",
  },
  {
    title: "2. How we use your data",
    body: "Your profile and resume are shared with employers only when you apply to their jobs. We use your skills and preferences to recommend relevant opportunities, and we send you status updates about your applications.",
  },
  {
    title: "3. Sharing your information",
    body: "We do not sell your personal data. Applications transfer your profile details to the employer you applied to. Aggregated, anonymised statistics may be used for platform analytics.",
  },
  {
    title: "4. Data retention",
    body: "We retain your account data while your account is active. You can request deletion of your account and associated data at any time by contacting us.",
  },
  {
    title: "5. Security",
    body: "We use industry-standard encryption, secure storage and access controls to protect your data. Resumes and uploaded files are not publicly accessible.",
  },
  {
    title: "6. Your rights",
    body: "You can access, correct, export or delete your personal data through your account settings or by contacting our support team.",
  },
  {
    title: "7. Contact",
    body: "For privacy questions or data requests, contact privacy@upjob.app.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Navbar />
      <main className="container-upjob max-w-3xl py-14">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated: September 2026</p>
        <div className="mt-8 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-base font-semibold text-zinc-900">{s.title}</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-600">{s.body}</p>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}