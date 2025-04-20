import ProjectInvitation from "@/components/emails/project-invitation";
import { sendEmail } from "@/lib/resend";

export const sendTeammateProjectInviteEmail = async ({
  senderName,
  senderEmail,
  projectName,
  to,
  url,
}: {
  senderName: string;
  senderEmail: string;
  projectName: string;
  to: string;
  url: string;
}) => {
  try {
    await sendEmail({
      to: to,
      subject: `You are invited to join ${projectName} on Claritycs AI`,
      react: ProjectInvitation({
        senderName,
        senderEmail,
        projectName,
        url,
      }),
    //   test: process.env.NODE_ENV === "development",
    });
  } catch (e) {
    console.error(e);
  }
};
