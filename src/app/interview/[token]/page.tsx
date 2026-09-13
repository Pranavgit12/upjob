import { InterviewRoom } from "@/components/interview-room";

export const dynamic = "force-dynamic";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InterviewRoom token={token} />;
}