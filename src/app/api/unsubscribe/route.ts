import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

type UnsubRecord = {
  email: string;
  createdAt: Date;
  source?: string;
};

async function record(email: string, source?: string) {
  const col = await getCollection<UnsubRecord>("unsubscribes");
  await col.updateOne(
    { email: email.toLowerCase() },
    { $set: { email: email.toLowerCase(), createdAt: new Date(), source } },
    { upsert: true }
  );
}

export async function GET(req: NextRequest) {
  const email = new URL(req.url).searchParams.get("email");
  if (email) await record(email, "get");
  // Render a simple confirmation page
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Unsubscribed</title></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto;">
      <h1>You have been unsubscribed</h1>
      <p>If this was a mistake, you can contact support.</p>
    </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email: string | undefined = body?.email;
    if (email) await record(email, "one-click");
  } catch {
    // ignore
  }
  return NextResponse.json({ ok: true });
}


