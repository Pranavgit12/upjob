import { InterviewCheck } from "@/components/interview-check";

export default async function CheckPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InterviewCheck token={token} />;
}