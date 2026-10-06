"use client";

import * as React from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

export function ContactForm() {
  const { toast } = useToast();
  const [sending, setSending] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", subject: "", message: "" });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((cur) => ({ ...cur, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast("Please fill in every field", { type: "error" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error || "Could not send your message", { type: "error" });
        return;
      }
      toast("Message sent", { type: "success", description: "We usually reply within one business day." });
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      toast("Something went wrong", { type: "error", description: "Please try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold text-zinc-900">Send a message</h2>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Name
          </label>
          <Input id="contact-name" name="name" placeholder="Your name" value={form.name} onChange={set("name")} autoComplete="name" required />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Email
          </label>
          <Input id="contact-email" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} autoComplete="email" required />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="contact-subject" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Subject
          </label>
          <Input id="contact-subject" name="subject" placeholder="How can we help?" value={form.subject} onChange={set("subject")} required />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Message
          </label>
          <Textarea id="contact-message" name="message" rows={6} placeholder="Write your message here..." value={form.message} onChange={set("message")} required />
        </div>
      </div>
      <Button type="submit" className="mt-5" disabled={sending}>
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send Message
          </>
        )}
      </Button>
    </form>
  );
}
