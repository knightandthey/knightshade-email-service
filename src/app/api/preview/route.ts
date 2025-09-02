import { NextRequest, NextResponse } from "next/server";
import { getTemplateById } from "@/lib/email-templates";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { templateId, variables } = body as {
    templateId: string;
    variables: Record<string, unknown>;
  };

  const template = getTemplateById(templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  try {
    const html = await template.render(variables || {});
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}


