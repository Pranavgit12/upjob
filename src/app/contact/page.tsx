import type { Metadata } from "next";
import { Mail, MessagesSquare, Building2, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the UpJob team — for candidates, employers and partners.",
};

export default function ContactPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Navbar />
      <section className="border-b border-zinc-100 bg-zinc-50/50">
        <div className="container-upjob py-12 text-center">
          <Badge variant="accent">Contact</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900">Let&apos;s talk</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-zinc-500">
            Questions about your job search, or interested in hiring on UpJob? We usually reply
            within one business day.
          </p>
        </div>
      </section>

      <section className="container-upjob grid grid-cols-1 gap-8 py-12 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          {[
            {
              icon: Building2,
              title: "For employers",
              description: "Post jobs, sponsorships and hiring solutions.",
              href: "mailto:employers@upjob.app",
            },
            {
              icon: MessagesSquare,
              title: "For candidates",
              description: "Application help, profile support and feedback.",
              href: "mailto:support@upjob.app",
            },
            {
              icon: ShieldCheck,
              title: "Report something",
              description: "Flag a suspicious job or company.",
              href: "mailto:safety@upjob.app",
            },
          ].map((c) => (
            <a
              key={c.title}
              href={c.href}
              className="flex items-start gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white">
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">{c.title}</p>
                <p className="mt-1 text-xs text-zinc-500">{c.description}</p>
              </div>
            </a>
          ))}

          <div className="rounded-2xl bg-zinc-950 p-6 text-white">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="h-4 w-4 text-blue-400" />
              Email us directly
            </p>
            <a
              href="mailto:hello@upjob.app"
              className="mt-2 block text-sm font-medium text-blue-400 hover:underline"
            >
              hello@upjob.app
            </a>
          </div>
        </div>

        <ContactForm />
      </section>

      <Footer />
    </div>
  );
}