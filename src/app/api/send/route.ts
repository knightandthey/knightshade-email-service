import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getTemplateById } from "@/lib/email-templates";
import { getCollection, type EmailLog } from "@/lib/mongodb";
import { getServerEnv } from "@/lib/env";

export async function POST(req: NextRequest) {
  const { RESEND_API_KEY, EMAIL_FROM } = getServerEnv();
  if (!RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Missing RESEND_API_KEY" },
      { status: 500 }
    );
  }

  const resend = new Resend(RESEND_API_KEY);

  const body = await req.json();
  const {
    to,
    cc,
    bcc,
    from,
    subject,
    templateId,
    variables,
  } = body as {
    to: string;
    cc?: string;
    bcc?: string;
    from?: string;
    subject: string;
    templateId: string;
    variables: Record<string, unknown>;
  };

  const template = getTemplateById(templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const html = template.render(variables || {});
  const fromAddress = from || EMAIL_FROM || "no-reply@example.com";

  const emails = await getCollection<EmailLog>("emails");
  const queuedLog: EmailLog = {
    to,
    cc,
    bcc,
    from: fromAddress,
    subject,
    template: templateId,
    variables: variables || {},
    status: "queued",
    createdAt: new Date(),
  };
  const insertResult = await emails.insertOne(queuedLog as any);

  try {
    const { data, error } = await resend.emails.send({
      to,
      cc,
      bcc,
      from: fromAddress,
      subject,
      html,
    });
    if (error) throw error;

    await emails.updateOne(
      { _id: insertResult.insertedId },
      { $set: { status: "sent", messageId: data?.id } }
    );
    return NextResponse.json({ id: data?.id });
  } catch (err: unknown) {
    await emails.updateOne(
      { _id: insertResult.insertedId },
      { $set: { status: "failed", error: (err as Error).message } }
    );
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}


