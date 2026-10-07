export type UserRole = "candidate" | "employer" | "admin";

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  industry: string;
  location: string;
  companySize: string;
  description: string;
  website?: string;
  isPartner: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  hiringStatus: "hiring" | "not-hiring" | "unknown";
  founded?: string;
  headquarters?: string;
  specialties?: string[];
  internshipAvailable?: boolean;
}

export type JobType = "Internship" | "Full-time" | "Part-time" | "Contract";
export type WorkMode = "Remote" | "Hybrid" | "On-site";

export interface Job {
  id: string;
  title: string;
  companyId: string;
  companyName?: string;
  location: string;
  type: JobType;
  workMode: WorkMode;
  salaryMin: number;
  salaryMax: number | null;
  isStipend?: boolean;
  experience: string;
  skills: string[];
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  status: "open" | "closed";
  category: string;
  createdAt: string;
  applicationDeadline: string;
  vacancy?: number;
}

export type JobCardData = Pick<
  Job,
  | "id"
  | "title"
  | "companyId"
  | "companyName"
  | "location"
  | "type"
  | "workMode"
  | "salaryMin"
  | "salaryMax"
  | "experience"
>;

export interface JobListing extends JobCardData {
  category: string;
  skills: string[];
  createdAt: string;
  company: Pick<Company, "name" | "industry" | "slug" | "isVerified">;
}

export interface InternshipListing {
  job: JobCardData & { skills: string[] };
  domain: string;
  internshipType: WorkMode;
  paid: boolean;
  duration: string;
}

export type ApplicationStatus =
  | "Applied"
  | "Under Review"
  | "Shortlisted"
  | "Interview"
  | "Selected"
  | "Rejected";

export interface CandidateProfile {
  name: string;
  headline: string;
  about: string;
  location: string;
  education: Education;
  skills: string[];
  experience: Experience[];
  projects: Project[];
  certifications: Certification[];
  github?: string;
  linkedin?: string;
  portfolio?: string;
  resumeUrl?: string;
  isProfilePhoto: boolean;
  hasExperience: boolean;
  hasEducation: boolean;
  hasSkills: boolean;
  hasProjects: boolean;
  hasAbout: boolean;
  hasContactInfo: boolean;
}

export interface Education {
  degree: string;
  college: string;
  graduationYear: string;
  field?: string;
}

export interface Experience {
  role: string;
  company: string;
  startDate: string;
  endDate?: string;
  description?: string;
  current?: boolean;
}

export interface Project {
  name: string;
  description: string;
  link?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  year?: string;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  companyId: string;
  companyName: string;
  companyLogo?: string;
  appliedDate: string;
  status: ApplicationStatus;
}
