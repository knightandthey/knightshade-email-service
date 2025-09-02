import { NextRequest, NextResponse } from "next/server";
import { getCollection, type EmailLog } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const emails = await getCollection<EmailLog>("emails");
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || 50);
  const items = await emails
    .find({}, { sort: { createdAt: -1 } })
    .limit(limit)
    .toArray();
  return NextResponse.json(items);
}


