import "server-only";

/**
 * Sends transactional email through Resend when RESEND_API_KEY is configured.
 * Without an API key the message is printed to the server console so password
 * resets can still be completed during local development.
 */
export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "FA COACHING <onboarding@resend.dev>";

  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.log(
      `\n[mail:dev] To: ${input.to}\n[mail:dev] Subject: ${input.subject}\n${input.text}\n`,
    );
    return { sent: false };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });
    return { sent: response.ok };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[mail] send failed", error);
    return { sent: false };
  }
}

export function appUrl() {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3100";
}
