import { notFound } from "next/navigation";

import { HostConsole } from "@/components/HostConsole";
import { getRoomState } from "@/lib/rooms";

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

  return <HostConsole state={state} />;
}
