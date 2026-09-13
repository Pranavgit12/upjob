import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://upjob.app"),
  title: {
    default: "UpJob — Intern Today. Get Hired Tomorrow.",
    template: "%s | UpJob",
  },
  description:
    "Discover internships and jobs from startups, growing companies and leading enterprises. Find opportunities matched to your skills on UpJob.",
  openGraph: {
    title: "UpJob — Intern Today. Get Hired Tomorrow.",
    description:
      "Discover internships and jobs from startups, growing companies and leading enterprises — all in one place.",
    url: "https://upjob.app",
    siteName: "UpJob",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UpJob — Intern Today. Get Hired Tomorrow.",
    description:
      "Discover internships and jobs matched to your skills on UpJob.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}