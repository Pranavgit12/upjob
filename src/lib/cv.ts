export interface CvProfileSource {
  headline?: string | null;
  about?: string | null;
  skills?: string[];
  education?: {
    degree?: string | null;
    field?: string | null;
    institution?: string | null;
    graduationYear?: number | null;
  } | null;
  experience?: {
    role?: string | null;
    company?: string | null;
    current?: boolean | null;
    endDate?: Date | string | null;
    description?: string | null;
  }[];
  projects?: {
    name?: string | null;
    description?: string | null;
    link?: string | null;
  }[];
  certifications?: {
    name?: string | null;
    issuer?: string | null;
  }[];
}

export function buildCvSections(profile: CvProfileSource | null): string[][] {
  if (!profile) return [];
  const sections: string[][] = [];

  const summary = [profile.headline, profile.about].filter(Boolean);
  if (summary.length) sections.push(summary as string[]);

  if (profile.skills?.length) {
    sections.push([profile.skills.join(", ")]);
  }

  if (profile.education) {
    const edu = profile.education;
    sections.push(
      [
        [edu.degree, edu.field].filter(Boolean).join(" in "),
        edu.institution || undefined,
        edu.graduationYear ? `Class of ${edu.graduationYear}` : undefined,
      ].filter(Boolean) as string[]
    );
  }

  if (profile.experience?.length) {
    sections.push(
      profile.experience.map((exp) =>
        [
          exp.role,
          exp.company,
          exp.current ? "Present" : exp.endDate ? formatDate(exp.endDate) : undefined,
          exp.description,
        ]
          .filter(Boolean)
          .join(" — ")
      )
    );
  }

  if (profile.projects?.length) {
    sections.push(
      profile.projects.map((p) => [p.name, p.description, p.link].filter(Boolean).join(" — "))
    );
  }

  if (profile.certifications?.length) {
    sections.push(
      profile.certifications.map((c) => [c.name, c.issuer].filter(Boolean).join(" — "))
    );
  }

  return sections;
}

export function buildCvText(profile: CvProfileSource | null): string {
  return buildCvSections(profile)
    .map((lines) => lines.map((l) => `- ${l}`).join("\n"))
    .join("\n\n");
}

function formatDate(value: Date | string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}