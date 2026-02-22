import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// =============================================================================
// Amazon SES — Email Helper
// =============================================================================

const globalForSes = globalThis as unknown as { ses: SESClient | undefined };

export const ses =
  globalForSes.ses ??
  new SESClient({
    region: process.env.AWS_SES_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY!,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForSes.ses = ses;
}

const DEFAULT_FROM = process.env.AWS_SES_FROM_EMAIL ?? "noreply@laundryshuttle.com";

// =============================================================================
// Send Email
// =============================================================================

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send an email via Amazon SES.
 * Returns the SES message ID on success.
 */
export async function sendEmail(params: SendEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const toAddresses = Array.isArray(params.to) ? params.to : [params.to];

  try {
    const command = new SendEmailCommand({
      Source: params.from ?? DEFAULT_FROM,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: {
          Data: params.subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: params.html,
            Charset: "UTF-8",
          },
          ...(params.text && {
            Text: {
              Data: params.text,
              Charset: "UTF-8",
            },
          }),
        },
      },
      ...(params.replyTo && {
        ReplyToAddresses: [params.replyTo],
      }),
    });

    const result = await ses.send(command);

    return {
      success: true,
      messageId: result.MessageId,
    };
  } catch (error) {
    console.error("SES send email error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

// =============================================================================
// Email Template Rendering
// =============================================================================

/**
 * Render an email template by replacing {{merge_tags}} with values.
 */
export function renderEmailTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, "g"),
      value
    );
  }
  return rendered;
}

/**
 * Wrap HTML content in a basic email layout.
 */
export function wrapInEmailLayout(params: {
  body: string;
  businessName: string;
  preheader?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.businessName}</title>
  ${params.preheader ? `<span style="display:none;max-height:0;overflow:hidden;">${params.preheader}</span>` : ""}
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
          <tr>
            <td style="padding:24px 32px;background-color:#1a1a1a;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${params.businessName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${params.body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#f9f9f9;text-align:center;">
              <p style="margin:0;color:#999;font-size:12px;">
                Powered by Laundry Shuttle
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
