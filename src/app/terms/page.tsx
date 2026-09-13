import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of the UpJob platform.",
};

const SECTIONS = [
  {
    title: "1. Acceptance of terms",
    body: "By accessing or using UpJob, you agree to these Terms of Service. If you do not agree, please do not use the platform.",
  },
  {
    title: "2. Accounts",
    body: "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate information when registering.",
  },
  {
    title: "3. Candidate responsibilities",
    body: "You agree to provide truthful information on your profile and applications. Falsified credentials, fake applications or misuse of the platform may result in account suspension.",
  },
  {
    title: "4. Employer responsibilities",
    body: "Employers must post genuine opportunities, comply with applicable employment laws, and never request payments or sensitive financial information from candidates as a condition of application.",
  },
  {
    title: "5. Listing labels",
    body: "Companies listed on UpJob are labelled as 'Company on UpJob', 'Featured', 'Hiring' or 'Partner'. A 'Partner' label indicates a verified partnership reviewed by UpJob and can never be self-declared by employers. These designations do not guarantee current hiring status.",
  },
  {
    title: "6. Prohibited conduct",
    body: "You may not use UpJob to post fraudulent offers, harvest candidate data, distribute malicious content, impersonate others or interfere with the platform's operation.",
  },
  {
    title: "7. Disclaimers",
    body: "UpJob provides the platform as-is. We do not guarantee employment outcomes, the accuracy of all third-party content, or that any particular application will succeed.",
  },
  {
    title: "8. Limitation of liability",
    body: "UpJob is not liable for interactions, agreements or losses between candidates and employers, including any disputes arising from applications or interviews arranged through the platform.",
  },
  {
    title: "9. Changes to terms",
    body: "We may update these terms from time to time. Material changes will be communicated through the platform. Continued use after changes constitute acceptance.",
  },
  {
    title: "10. Contact",
    body: "For questions about these terms, contact legal@upjob.app.",
  },
];

export default function TermsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Navbar />
      <main className="container-upjob max-w-3xl py-14">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Terms of Service</h1>
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