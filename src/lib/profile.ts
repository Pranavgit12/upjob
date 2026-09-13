import type { CandidateProfile } from "@/types";

// Neutral, empty profile. The candidate fills this in from their dashboard —
// no fictional identity is pre-filled.
export const INITIAL_PROFILE: CandidateProfile = {
  name: "",
  headline: "",
  about: "",
  location: "",
  education: {
    degree: "",
    college: "",
    graduationYear: "",
    field: "",
  },
  skills: [],
  experience: [],
  projects: [],
  certifications: [],
  github: "",
  linkedin: "",
  portfolio: "",
  resumeUrl: "",
  isProfilePhoto: false,
  hasExperience: false,
  hasEducation: false,
  hasSkills: false,
  hasProjects: false,
  hasAbout: false,
  hasContactInfo: false,
};

export function calculateProfileCompletion(profile: CandidateProfile): number {
  const checks = [
    profile.name.trim().length > 0,
    profile.headline.trim().length > 0,
    profile.about.trim().length > 5,
    profile.location.trim().length > 0,
    profile.hasEducation,
    profile.hasSkills,
    profile.hasExperience,
    profile.hasProjects,
    profile.isProfilePhoto,
    profile.resumeUrl && profile.resumeUrl.length > 0,
  ];
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}