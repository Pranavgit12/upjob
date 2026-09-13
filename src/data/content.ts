import { Code2, LineChart, Palette, ShieldCheck, Megaphone, Briefcase, Database, Users, Building2, GraduationCap, Globe2, ShoppingCart } from "lucide-react";

export const categories = [
  { name: "Software Development", icon: Code2, jobs: 5000, color: "text-blue-600", bg: "bg-blue-50" },
  { name: "Data Science", icon: Database, jobs: 3200, color: "text-emerald-600", bg: "bg-emerald-50" },
  { name: "AI / ML", icon: LineChart, jobs: 2800, color: "text-violet-600", bg: "bg-violet-50" },
  { name: "UI/UX Design", icon: Palette, jobs: 1500, color: "text-pink-600", bg: "bg-pink-50" },
  { name: "Marketing", icon: Megaphone, jobs: 4300, color: "text-orange-600", bg: "bg-orange-50" },
  { name: "Finance", icon: Briefcase, jobs: 3900, color: "text-amber-600", bg: "bg-amber-50" },
  { name: "Cybersecurity", icon: ShieldCheck, jobs: 1100, color: "text-red-600", bg: "bg-red-50" },
  { name: "Business Development", icon: Building2, jobs: 2600, color: "text-teal-600", bg: "bg-teal-50" },
  { name: "HR", icon: Users, jobs: 900, color: "text-indigo-600", bg: "bg-indigo-50" },
  { name: "Operations", icon: Globe2, jobs: 1800, color: "text-cyan-600", bg: "bg-cyan-50" },
  { name: "E-commerce", icon: ShoppingCart, jobs: 2200, color: "text-fuchsia-600", bg: "bg-fuchsia-50" },
  { name: "Education", icon: GraduationCap, jobs: 700, color: "text-lime-600", bg: "bg-lime-50" },
];

export const careerResources = [
  {
    title: "How to Write a Resume That Gets Shortlisted",
    category: "Resume & CV",
    readTime: "8 min read",
    excerpt: "Learn the exact structure recruiters look for, common mistakes to avoid, and how to tailor your resume for every application.",
    featured: true,
  },
  {
    title: "Cracking Your First Interview: A Complete Guide",
    category: "Interviews",
    readTime: "12 min read",
    excerpt: "From behavioural questions to technical rounds — everything you need to walk into your interview with confidence.",
    featured: false,
  },
  {
    title: "The Internship to Full-Time Playbook",
    category: "Career Advice",
    readTime: "6 min read",
    excerpt: "How to perform during your internship, build relationships, and position yourself for a pre-placement offer.",
    featured: false,
  },
  {
    title: "Building an Impressive Portfolio as a Fresher",
    category: "Portfolio",
    readTime: "7 min read",
    excerpt: "Project ideas, structure, and presentation tips to make your portfolio stand out to hiring managers.",
    featured: false,
  },
  {
    title: "Negotiating Your First Salary",
    category: "Salary Guide",
    readTime: "5 min read",
    excerpt: "Know what you're worth. Learn how to negotiate offers as a fresher without sounding demanding.",
    featured: false,
  },
  {
    title: "Remote Work Skills Every Employer Wants",
    category: "Remote Work",
    readTime: "4 min read",
    excerpt: "From async communication to self-management, master the skills that remote-first companies hire for.",
    featured: false,
  },
];

export const faqs = [
  {
    question: "Is UpJob free for job seekers?",
    answer: "Yes. Building your profile, searching jobs, and applying to opportunities on UpJob is completely free for candidates.",
  },
  {
    question: "Are the companies on UpJob formally partnered?",
    answer: "Not automatically. Companies listed on UpJob carry labels like 'Company on UpJob', 'Featured Company', or 'Hiring Company'. A 'Partner' label is only shown for verified partnerships. Always verify a job posting through the company's official channels when in doubt.",
  },
  {
    question: "How do I know a job posting is genuine?",
    answer: "UpJob reviews and moderates all job postings. Verified companies carry a 'Verified' label, and every listing is moderated before it goes live. If something looks off, use the Report Job feature and never pay an employer for an application.",
  },
  {
    question: "Which roles can I find on UpJob?",
    answer: "Internships and full-time roles across software, design, marketing, finance, data, product, HR, sales, and more — from startups to global enterprises.",
  },
  {
    question: "Can employers post jobs on UpJob?",
    answer: "Yes. Employers can create a company profile, post jobs, review applications, shortlist candidates, and schedule interviews from the employer dashboard.",
  },
];