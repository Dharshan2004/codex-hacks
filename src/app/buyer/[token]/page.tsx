import { notFound } from "next/navigation";

import { BuyerView } from "@/components/BuyerView";
import { getRoomStateByToken } from "@/lib/rooms";

export const dynamic = "force-dynamic";

// Buyer view (Issues 002 + 003): livestream-style video area, linked lineup,
// and a realtime chat the buyer can post into.
export default async function BuyerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const state = await getRoomStateByToken(token);
  if (!state) notFound();

  return <BuyerView state={state} />;
}
