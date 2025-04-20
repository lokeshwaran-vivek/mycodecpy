import { sendTeammateProjectInviteEmail } from "@/lib/emails/send-teammate-project-invite";
import { logger, task } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";

interface SendProjectInvitesPayload {
  projectId: string;
  memberIds: string[];
  user: {
    name: string;
    email: string;
  };
}

export const sendProjectInvitesTask = task({
  id: "send-project-invites",
  maxDuration: 300,
  run: async (payload: SendProjectInvitesPayload, { ctx }) => {
    try {
      const { projectId, memberIds, user } = payload;

      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      const projectName = project.name;

      for (const memberId of memberIds) {
        const member = await prisma.user.findUnique({
          where: { id: memberId },
          select: {
            email: true,
          },
        });

        if (!member) {
          throw new Error("Member not found");
        }

        await sendTeammateProjectInviteEmail({
          senderName: user.name,
          senderEmail: user.email,
          projectName,
          to: member.email,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${projectId}`,
        });
      }
    } catch (error) {
    console.log('error :', error);
      logger.error(error as string);
      throw error;
    }
  },
});
