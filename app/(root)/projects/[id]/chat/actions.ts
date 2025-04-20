"use server";

import { errorResponse, requireAuth, successResponse } from "@/app/api/utils";
import { prisma } from "@/lib/prisma";
import { deductChatCredits } from "@/lib/wallet";
import { MessageRole } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";

export const addMessage = async (message: {
  content: string;
  role: MessageRole;
  projectId: string;
  businessId: string | null;
  metadata?: JsonValue;
}) => {
  if (!message.businessId) {
    return errorResponse("Business not found");
  }
  if (!message.projectId) {
    return errorResponse("Project not found");
  }
  if (!message.role) {
    return errorResponse("Role not found");
  }
  if (!message.content) {
    return errorResponse("Content not found");
  }

  try {
    const { user } = await requireAuth();

    if (!user) {
      return errorResponse("Unauthorized");
    }
    if (!user.businessId) {
      return errorResponse("Business not found");
    }

    const { content, role, projectId } = message;
    const newMessage = await prisma.message.create({
      data: {
        content,
        role,
        projectId,
        userId: user.id,
        businessId: message.businessId,
        ...(message.metadata ? { metadata: message.metadata } : {}),
      },
    });
    await deductChatCredits(
      message.businessId,
      message.projectId,
      user.id,
    );
    return successResponse(newMessage);
  } catch (error) {
    console.error("Error adding message:", error);
    return errorResponse("Failed to add message");
  }
};

export const getMessages = async (projectId: string) => {
  try {
    const { user } = await requireAuth();

    if (!user) {
      return errorResponse("Unauthorized");
    }

    const messages = await prisma.message.findMany({
      where: {
        userId: user.id,
        projectId,
      },
      orderBy: {
        timestamp: "asc",
      },
    });
    return successResponse(messages);
  } catch (error) {
    console.error("Error getting messages:", error);
    return errorResponse("Failed to get messages");
  }
};
