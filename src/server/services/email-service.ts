import { Resend } from "resend";
import { render } from "@react-email/render";
import { serverEnv } from "@/server/env";
import type React from "react";

interface EmailPayload {
  to: string;
  subject: string;
  reactTemplate: React.ReactElement;
}

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!serverEnv.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(serverEnv.RESEND_API_KEY);
  }
  return resendClient;
}

export async function sendTransactionalEmail(payload: EmailPayload): Promise<void> {
  const client = getResendClient();

  if (!client) {
    console.warn("[email-service] RESEND_API_KEY not configured — email not sent");
    return;
  }

  try {
    const html = await render(payload.reactTemplate);

    await client.emails.send({
      from: serverEnv.RESEND_FROM_EMAIL,
      to: payload.to,
      subject: payload.subject,
      html,
    });
  } catch (error) {
    console.error("[email-service] Failed to send email:", error);
  }
}
