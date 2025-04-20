import TeamInvitation from "@/components/emails/team-invitation";
import { sendEmail } from "@/lib/resend";

export const sendTeammateInviteEmail = async ({
  senderName,
  senderEmail,
  businessName,
  to,
  url,
}: {
  senderName: string;
  senderEmail: string;
  businessName: string;
  to: string;
  url: string;
}) => {
  try {
    await sendEmail({
      to: to,
      subject: `You are invited to join ${businessName} on Claritycs AI`,
      react: TeamInvitation({
        senderName,
        senderEmail,
        businessName,
        url,
      }),
      // test: process.env.NODE_ENV === "development",
    });
  } catch (e) {
    console.error(e);
  }
};
