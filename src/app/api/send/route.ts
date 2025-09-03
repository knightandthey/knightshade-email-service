import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getTemplateById } from "@/lib/email-templates";
import { getCollection, type EmailLog } from "@/lib/mongodb";
import { getServerEnv } from "@/lib/env";

function sanitizeHtmlContent(html: string): string {
  let out = html;
  // Remove hidden preview padding blocks
  out = out.replace(/<div[^>]*data-skip-in-text[^>]*>.*?<\/div>/gis, "");
  // Remove leftover template placeholders like {color}, {fontSize}
  out = out.replace(/\{[a-zA-Z0-9_]+\}/g, "");
  // Collapse excessive <span><br/></span>
  out = out.replace(/<span>\s*<br\s*\/>\s*<\/span>/g, "<br>");
  // Remove repeated <br>
  out = out.replace(/(<br\s*\/>\s*){3,}/g, "<br><br>");
  // Remove obvious invalid declarations like "color: color"
  out = out.replace(/color:\s*color\s*;?/gi, "");
  // Clean style attributes: keep only valid declarations
  out = out.replace(/\sstyle="([^"]*)"/gi, (_m, s: string) => {
    const safe = s
      .split(';')
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
      .filter((r) => !/[{}]/.test(r))
      .map((r) => {
        const m = r.match(/^([a-zA-Z\-]+)\s*:\s*(.+)$/);
        if (!m) return '';
        const prop = m[1].toLowerCase();
        const val = m[2].trim();
        // drop values that look empty or placeholders
        if (!val || val === 'px' || val === 'em' || val === 'rem' || val === 'color') return '';
        // basic allowlist for common props
        const allowed = [
          'color', 'background-color', 'font-size', 'font-weight', 'line-height', 'text-align',
          'border-radius', 'padding', 'margin', 'display', 'max-width', 'height', 'width',
        ];
        if (!allowed.includes(prop)) return '';
        // rudimentary validity: no quotes/braces and reasonable length
        if (/['"{}]/.test(val) || val.length > 100) return '';
        return `${prop}:${val}`;
      })
      .filter(Boolean)
      .join(';');
    return safe ? ` style="${safe}"` : '';
  });
  return out;
}

export async function POST(req: NextRequest) {
  const { RESEND_API_KEY, EMAIL_FROM, BASE_URL } = getServerEnv();
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
    attachments,
  } = body as {
    to: string;
    cc?: string;
    bcc?: string;
    from?: string;
    subject: string;
    templateId: string;
    variables: Record<string, unknown>;
    attachments?: Array<{ filename: string; content: string; type?: string }>;
  };

  const template = getTemplateById(templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const html = await template.render(variables || {});
  const cleanedHtml = sanitizeHtmlContent(html);
  const text = typeof variables?.plaintext === "string" ? (variables.plaintext as string) : undefined;
  const fromAddress = from || EMAIL_FROM || "no-reply@example.com";
  const domainMatch = fromAddress.match(/<[^@>]+@([^>]+)>/) || fromAddress.match(/@([^>\s]+)/);
  const fromDomain = domainMatch ? domainMatch[1] : undefined;

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
  const insertResult = await emails.insertOne(queuedLog);

  try {
    const { data, error } = await resend.emails.send({
      to,
      cc,
      bcc,
      from: fromAddress,
      subject,
      html: cleanedHtml,
      text,
      attachments,
      headers: {
        "List-Unsubscribe": `${fromDomain ? `<mailto:unsubscribe@${fromDomain}?subject=unsubscribe>, ` : ""}<${(BASE_URL || new URL(req.url).origin) + "/api/unsubscribe"}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "Feedback-ID": "knightshade-email-service:transactional", // some filters use it
      },
      reply_to: fromAddress,
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


