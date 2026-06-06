import { notFound } from "next/navigation";

import { HostConsole } from "@/components/HostConsole";
import { getRoomState } from "@/lib/rooms";
import { maybeCreateSalesCoachPromptForTimer } from "@/lib/salesCoachPrompts";

export const dynamic = "force-dynamic";

// Host producer console (Issue 003): camera preview, live chat, product lineup,
// spotlight control, and reserved space for AI actions / escalations / coach /
// activity log (populated by later slices).
export default async function HostPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const state = await getRoomState(roomId);
  if (!state) notFound();

  try {
    await maybeCreateSalesCoachPromptForTimer(roomId);
  } catch (error) {
    console.error("Failed to seed sales coach timer prompt", error);
  }

  return <HostConsole state={state} />;
}
