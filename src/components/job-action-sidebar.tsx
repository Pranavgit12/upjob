"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/save-button";
import { ApplicationModal } from "@/components/application-modal";

export function JobActionSidebar({
  jobId,
  jobTitle,
  companyName,
  companyId,
  deadline,
}: {
  jobId: string;
  jobTitle: string;
  companyName: string;
  companyId: string;
  deadline: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" variant="accent" className="w-full" onClick={() => setOpen(true)}>
        Apply Now
      </Button>
      <div className="flex w-full items-center justify-center">
        <SaveButton jobId={jobId} />
      </div>
      <p className="mt-2 text-center text-xs text-zinc-400">
        Apply before <span className="font-medium text-zinc-600">{deadline}</span>
      </p>

      <ApplicationModal
        open={open}
        onOpenChange={setOpen}
        jobId={jobId}
        jobTitle={jobTitle}
        companyName={companyName}
        companyId={companyId}
      />
    </div>
  );
}