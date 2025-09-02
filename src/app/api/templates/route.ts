import { NextRequest, NextResponse } from "next/server";
import { templates } from "@/lib/email-templates";

export async function GET(_req: NextRequest) {
  return NextResponse.json(
    templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      variables: t.variables,
    }))
  );
}


