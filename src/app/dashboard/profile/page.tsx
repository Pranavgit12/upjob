"use client";

import * as React from "react";
import {
  GraduationCap,
  Award,
  FolderGit2,
  BadgeCheck,
  Globe,
  Plus,
  Pencil,
} from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/brand-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { storeGet, storeSet, STORAGE_KEYS } from "@/lib/store";
import { INITIAL_PROFILE, calculateProfileCompletion } from "@/lib/profile";
import type { CandidateProfile } from "@/types";

export default function ProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = React.useState<CandidateProfile>(INITIAL_PROFILE);
  const [editing, setEditing] = React.useState(false);
  const [skillInput, setSkillInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    storeGet<CandidateProfile>(STORAGE_KEYS.profile, INITIAL_PROFILE).then((p) => {
      if (mounted) setProfile(p);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const completion = calculateProfileCompletion(profile);

  const save = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    await storeSet(STORAGE_KEYS.profile, profile);
    setSaving(false);
    setEditing(false);
    toast("Profile saved", { type: "success" });
  };

  const addSkill = () => {
    if (!skillInput.trim()) return;
    setProfile({
      ...profile,
      skills: [...profile.skills, skillInput.trim()],
      hasSkills: true,
    });
    setSkillInput("");
  };

  const update = <K extends keyof CandidateProfile>(key: K, value: CandidateProfile[K]) => {
    setProfile({ ...profile, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Profile</h1>
          <p className="mt-1 text-sm text-zinc-500">Your public profile shown to recruiters.</p>
        </div>
        {!editing ? (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* Completion */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-zinc-100" strokeWidth="3.5" />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#2563eb"
                strokeWidth="3.5"
                strokeDasharray={`${(completion / 100) * 100} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-zinc-900">
              {completion}%
            </span>
          </div>
          <div>
            <p className="text-base font-semibold text-zinc-900">Profile {completion}% complete</p>
            <p className="mt-1 text-sm text-zinc-500">
              Complete your profile to improve your chances of getting noticed by recruiters.
            </p>
          </div>
        </div>
      </div>

      {/* Basic info */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Basic Information</h2>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Full name</label>
            <Input
              value={profile.name}
              disabled={!editing}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Headline</label>
            <Input
              value={profile.headline}
              disabled={!editing}
              onChange={(e) => update("headline", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Location</label>
            <Input
              value={profile.location}
              disabled={!editing}
              onChange={(e) => update("location", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Profile photo</label>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-base font-semibold text-white">
                {profile.name.charAt(0)}
              </div>
              {editing && (
                <button
                  onClick={() => update("isProfilePhoto", true)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  Upload photo
                </button>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">About</label>
            <Textarea
              rows={4}
              value={profile.about}
              disabled={!editing}
              onChange={(e) => update("about", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Skills</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700"
            >
              {skill}
              {editing && (
                <button
                  onClick={() =>
                    update("skills", profile.skills.filter((s) => s !== skill))
                  }
                  className="text-zinc-400 hover:text-red-500"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        {editing && (
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Add a skill (e.g. Python)"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSkill()}
            />
            <Button variant="outline" onClick={addSkill}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        )}
      </div>

      {/* Education */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
          <GraduationCap className="h-4 w-4 text-blue-600" />
          Education
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Input
            value={profile.education.degree}
            disabled={!editing}
            placeholder="Degree"
            onChange={(e) => update("education", { ...profile.education, degree: e.target.value })}
          />
          <Input
            value={profile.education.college}
            disabled={!editing}
            placeholder="College"
            onChange={(e) => update("education", { ...profile.education, college: e.target.value })}
          />
          <Input
            value={profile.education.graduationYear}
            disabled={!editing}
            placeholder="Graduation year"
            onChange={(e) => update("education", { ...profile.education, graduationYear: e.target.value })}
          />
        </div>
      </div>

      {/* Experience */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Experience</h2>
        <div className="mt-4 space-y-4">
          {profile.experience.map((exp, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-4 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4"
            >
              <div>
                <p className="text-sm font-semibold text-zinc-900">{exp.role}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{exp.company}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {exp.startDate} — {exp.current ? "Present" : exp.endDate}
                </p>
              </div>
              {editing && (
                <button
                  onClick={() => update("experience", profile.experience.filter((_, idx) => idx !== i))}
                  className="text-xs font-medium text-red-500 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        {editing && (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() =>
              update("experience", [
                ...profile.experience,
                { role: "", company: "", startDate: "", endDate: "", current: false },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            Add experience
          </Button>
        )}
      </div>

      {/* Projects + certs */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <FolderGit2 className="h-4 w-4 text-violet-600" />
            Projects
          </h2>
          <div className="mt-4 space-y-4">
            {profile.projects.map((project, i) => (
              <div key={i} className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
                <p className="text-sm font-semibold text-zinc-900">{project.name}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{project.description}</p>
                {project.link && (
                  <a href={project.link} className="mt-1 block text-xs font-medium text-blue-600 hover:underline">
                    {project.link}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <Award className="h-4 w-4 text-amber-600" />
            Certifications
          </h2>
          <div className="mt-4 space-y-4">
            {profile.certifications.map((cert, i) => (
              <div key={i} className="flex items-start justify-between rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{cert.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {cert.issuer}
                    {cert.year && ` · ${cert.year}`}
                  </p>
                </div>
                <BadgeCheck className="h-4 w-4 text-emerald-500" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Links</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { key: "github", label: "GitHub", icon: GithubIcon, value: profile.github },
            { key: "linkedin", label: "LinkedIn", icon: LinkedinIcon, value: profile.linkedin },
            { key: "portfolio", label: "Portfolio", icon: Globe, value: profile.portfolio },
          ].map((link) => (
            <div key={link.key}>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700">
                <link.icon className="h-4 w-4" />
                {link.label}
              </label>
              <Input
                value={link.value}
                disabled={!editing}
                placeholder={`https://${link.label.toLowerCase()}.com/...`}
                onChange={(e) =>
                  update(link.key as "github", e.target.value)
                }
              />
            </div>
))}
        </div>
      </div>
    </div>
  );
}