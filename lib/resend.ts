import { JSXElementConstructor, ReactElement } from "react";

import { render } from "@react-email/components";
import { Resend } from "resend";
import { log } from "./utils/log";
import { nanoid } from "./utils";

export const resend = process.env.NEXT_PUBLIC_RESEND_API_KEY
  ? new Resend(process.env.NEXT_PUBLIC_RESEND_API_KEY)
  : null;

export const sendEmail = async ({
  to,
  subject,
  react,
  test,
  cc,
  replyTo,
  scheduledAt,
  unsubscribeUrl,
}: {
  to: string;
  subject: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  react: ReactElement<any, string | JSXElementConstructor<any>>;
  test?: boolean;
  cc?: string | string[];
  replyTo?: string;
  scheduledAt?: string;
  unsubscribeUrl?: string;
}) => {
  if (!resend) {
    throw new Error("Resend not initialized");
  }
  const plainText = await render(react, { plainText: true });

  try {
    const { data, error } = await resend.emails.send({
      from: "Claritycs AI <support@claritycs.ai>",
      to: test ? "delivered@resend.dev" : to,
      cc: cc,
      replyTo: replyTo,
      subject,
      react,
      scheduledAt,
      text: plainText,
      headers: {
        "X-Entity-Ref-ID": nanoid(),
        ...(unsubscribeUrl ? { "List-Unsubscribe": unsubscribeUrl } : {}),
      },
    });

    // Check if the email sending operation returned an error and throw it
    if (error) {
      log({
        message: `Resend returned error when sending email: ${error.name} \n\n ${error.message}`,
        type: "error",
        mention: true,
      });
      throw error;
    }

    // If there's no error, return the data
    return data;
  } catch (exception) {
    // Log and rethrow any caught exceptions for upstream handling
    log({
      message: `Unexpected error when sending email: ${exception}`,
      type: "error",
      mention: true,
    });
    throw exception; // Rethrow the caught exception
  }
};
