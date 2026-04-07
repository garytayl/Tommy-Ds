import { getInstallerOrOfficeApiSessionOrNull } from "@/lib/api-auth";
import {
  getStripeServerClient,
  getStripeTerminalLocationId,
  isStripeTerminalConfigured,
} from "@/lib/stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getInstallerOrOfficeApiSessionOrNull(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeTerminalConfigured()) {
    return NextResponse.json(
      { error: "Stripe Terminal is not configured" },
      { status: 500 },
    );
  }

  try {
    const stripe = getStripeServerClient();
    const connectionToken = await stripe.terminal.connectionTokens.create({
      location: getStripeTerminalLocationId(),
    });
    return NextResponse.json({ secret: connectionToken.secret });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create connection token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
