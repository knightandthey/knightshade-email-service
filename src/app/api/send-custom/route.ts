import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getCollection, type EmailLog } from "@/lib/mongodb";
import { getServerEnv } from "@/lib/env";

function sanitizeHtmlContent(html: string): string {
  let out = html;
  out = out.replace(/<div[^>]*data-skip-in-text[^>]*>.*?<\/div>/gis, "");
  out = out.replace(/\{[a-zA-Z0-9_]+\}/g, "");
  out = out.replace(/<span>\s*<br\s*\/>\s*<\/span>/g, "<br>");
  out = out.replace(/(<br\s*\/>\s*){3,}/g, "<br><br>");
  out = out.replace(/color:\s*color\s*;?/gi, "");
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
        if (!val || val === 'px' || val === 'em' || val === 'rem' || val === 'color') return '';
        const allowed = [
          'color', 'background-color', 'font-size', 'font-weight', 'line-height', 'text-align',
          'border-radius', 'padding', 'margin', 'display', 'max-width', 'height', 'width',
        ];
        if (!allowed.includes(prop)) return '';
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
    content,
    mode,
    attachments,
  } = body as {
    to: string;
    cc?: string;
    bcc?: string;
    from?: string;
    subject: string;
    content: string;
    mode: "html" | "react" | "css" | "javascript" | "plaintext";
    attachments?: Array<{ filename: string; content: string; type?: string }>;
  };

  const fromAddress = from || EMAIL_FROM || "no-reply@example.com";
  let finalHtml = content;
  let finalText: string | undefined;

  // Process content based on mode
  try {
    if (mode === "react") {
      // Compile React code to HTML
      const compileResponse = await fetch(`${req.nextUrl.origin}/api/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: content, type: "react" }),
      });
      
      if (!compileResponse.ok) {
        throw new Error("Failed to compile React code");
      }
      
      finalHtml = await compileResponse.text();
    } else if (mode === "css") {
      // For CSS mode, create a basic HTML wrapper
      finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            ${content}
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>Custom Email</h1>
            </div>
            <div class="content">
              <p>This email was created with custom CSS styles.</p>
            </div>
            <div class="footer">
              <p>Thank you for using our service!</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (mode === "javascript") {
      // For JavaScript mode, we'll send the result as HTML
      finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1>Dynamic Email Content</h1>
            <p>This email was generated using JavaScript logic.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <h3>Generated Content:</h3>
              <pre style="white-space: pre-wrap; font-family: monospace;">${content}</pre>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (mode === "plaintext") {
      // For plaintext, set both HTML and text versions
      finalText = content;
      finalHtml = content.replace(/\n/g, '<br>');
      finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${finalHtml}
        </body>
        </html>
      `;
    }
    // For HTML mode, use content as-is (finalHtml = content)
    finalHtml = sanitizeHtmlContent(finalHtml);
  } catch (error) {
    console.error("Error processing custom content:", error);
    return NextResponse.json(
      { error: `Failed to process ${mode} content: ${(error as Error).message}` },
      { status: 400 }
    );
  }

  // Log the email to database
  const emails = await getCollection<EmailLog>("emails");
  const queuedLog: EmailLog = {
    to,
    cc,
    bcc,
    from: fromAddress,
    subject,
    template: `custom-${mode}`,
    variables: { content, mode },
    status: "queued",
    createdAt: new Date(),
  };
  const insertResult = await emails.insertOne(queuedLog);

  try {
    // Send the email
    const emailData: {
      to: string | string[];
      cc?: string | string[];
      bcc?: string | string[];
      from: string;
      subject: string;
      html: string;
      text?: string;
      attachments?: Array<{
        filename: string;
        content: string;
        type: string;
        disposition: string;
      }>;
    } = {
      to,
      cc,
      bcc,
      from: fromAddress,
      subject,
      html: finalHtml,
      attachments,
    };

    // Add text version for plaintext mode
    if (finalText) {
      emailData.text = finalText;
    }

    // Add helpful headers to improve deliverability
    emailData.reply_to = fromAddress;
    const domainMatch = fromAddress.match(/<[^@>]+@([^>]+)>/) || fromAddress.match(/@([^>\s]+)/);
    const fromDomain = domainMatch ? domainMatch[1] : undefined;
    emailData.headers = {
      "List-Unsubscribe": `${fromDomain ? `<mailto:unsubscribe@${fromDomain}?subject=unsubscribe>, ` : ""}<${(BASE_URL || new URL(req.url).origin) + "/api/unsubscribe"}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "Feedback-ID": "knightshade-email-service:transactional",
    } as Record<string, string>;

    const { data, error } = await resend.emails.send(emailData);
    if (error) throw error;

    // Update log as sent
    await emails.updateOne(
      { _id: insertResult.insertedId },
      { $set: { status: "sent", messageId: data?.id } }
    );

    return NextResponse.json({ id: data?.id, message: "Email sent successfully" });
  } catch (err: unknown) {
    console.error("Error sending custom email:", err);
    
    // Update log as failed
    await emails.updateOne(
      { _id: insertResult.insertedId },
      { $set: { status: "failed", error: (err as Error).message } }
    );

    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
