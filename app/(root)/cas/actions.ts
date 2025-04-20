"use server";

import { ApiResponse, errorResponse, successResponse } from "@/app/api/utils";
import { requireAuth } from "@/lib/auth";
import { generatePassword, generateToken } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import {
  Prisma,
  User,
  UserRole,
  InvitationStatus,
  Status,
  UserType,
  BusinessInvitation,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { sendTeammateInviteEmail } from "@/lib/emails/send-teammate-invite";
export async function getUsers(
  query: string,
  page: number,
  pageSize: number
): Promise<
  ApiResponse<{
    users: (Partial<User> & { receivedInvitations: BusinessInvitation[] })[];
    totalPages: number;
    currentPage: number;
  } | null>
> {
  try {
    const { user } = await requireAuth();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const whereClause: Prisma.UserWhereInput = {
      businessId: user.businessId,
    };

    if (query) {
      whereClause.name = {
        contains: query,
      };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        receivedInvitations: true,
      },
    });

    const total = await prisma.user.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(total / pageSize);

    const usersWithTotalPages = {
      users,
      totalPages,
      currentPage: page,
    };

    return successResponse(usersWithTotalPages, "Users fetched successfully");
  } catch (error) {
    return errorResponse("Error fetching users", error);
  }
}

export async function getUserById(id: string) {
  try {
    const { user } = await requireAuth();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new Error("User not found");
    }

    return successResponse(existingUser, "User fetched successfully");
  } catch (error) {
    return errorResponse("Error fetching user", error);
  }
}

export async function inviteUser(data: Partial<User>) {
  try {
    const { user } = await requireAuth();
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const password = generatePassword();

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: data.email || "",
        phone: data.phone || "",
        designation: data.designation || "",
        expertise: data.expertise || "",
        businessId: user.businessId,
        name: data.name || data.email?.split("@")[0] || "",
        password: hashedPassword,
        role: data.role || UserRole.USER,
        status: Status.ACTIVE,
      },
    });

    const businessInvite = await prisma.businessInvitation.create({
      data: {
        businessId: user.businessId || "",
        email: data.email || "",
        role: UserRole.USER,
        status: InvitationStatus.PENDING,
        token: generateToken(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 60 minutes from now
        invitedById: user.id,
        invitedUserId: newUser.id,
      },
    });

    const business = await prisma.business.findUnique({
      where: { id: user.businessId || "" },
      select: {
        name: true,
      },
    });

    await prisma.passwordReset.create({
      data: {
        token: businessInvite.token,
        userId: newUser.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 60 minutes from now
      },
    });

    const verificationLink = `${process.env.NEXTAUTH_URL}/api/auth/accept-invitation?token=${businessInvite.token}`;

    console.log("--------------------------------");
    console.log("Verification link: ", verificationLink);
    console.log("--------------------------------");

    sendTeammateInviteEmail({
      senderName: user.name || "",
      senderEmail: user.email || "",
      businessName: business?.name || "",
      to: data.email || "",
      url: verificationLink,
    });

    revalidatePath("/cas");
    return successResponse(newUser, "User created successfully");
  } catch (error) {
    return errorResponse("Error inviting user", error);
  }
}

export async function acceptInvitation(token: string) {
  try {
    const businessInvitation = await prisma.businessInvitation.findUnique({
      where: { token },
    });

    console.log("businessInvitation :", businessInvitation);
    if (!businessInvitation) {
      return {
        success: false,
        message: "Invalid invitation token",
      };
    }

    if (businessInvitation.status !== InvitationStatus.PENDING) {
      return {
        success: false,
        message: "Invitation already accepted",
      };
    }

    if (businessInvitation.expiresAt < new Date()) {
      return {
        success: false,
        message: "Invitation expired",
      };
    }

    await prisma.businessInvitation.update({
      where: { id: businessInvitation.id },
      data: { status: InvitationStatus.ACCEPTED },
    });

    await prisma.user.update({
      where: { id: businessInvitation.invitedUserId || "" },
      data: { status: Status.ACTIVE },
    });

    return {
      success: true,
      message: "Invitation accepted successfully",
    };
  } catch {
    return {
      success: false,
      message: "Error accepting invitation",
    };
  }
}

export async function resetPassword(password: string, token?: string) {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    if (token) {
      const businessInvitation = await prisma.businessInvitation.findUnique({
        where: { token },
      });

      if (!businessInvitation) {
        throw new Error("Invalid invitation token");
      }

      if (businessInvitation.status !== InvitationStatus.ACCEPTED) {
        throw new Error("Invitation not accepted");
      }

      if (businessInvitation.expiresAt < new Date()) {
        throw new Error("Invitation expired");
      }

      await prisma.user.update({
        where: { id: businessInvitation.invitedUserId || "" },
        data: {
          password: hashedPassword,
          hasResetPassword: true,
          emailVerified: new Date(),
          isProfileComplete: true,
          type: UserType.BUSINESS,
        },
      });
    } else {
      const { user } = await requireAuth();
      if (!user) {
        return errorResponse("Unauthorized", 401);
      }
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          hasResetPassword: true,
        },
      });
    }

    return successResponse(null, "Password reset successfully");
  } catch (error) {
    return errorResponse("Error resetting password", error);
  }
}

export async function updateUserStatus(id: string, status: Status) {
  try {
    const { user } = await requireAuth();
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (user.role !== UserRole.OWNER) {
      return errorResponse("Only business owner can update user status", 401);
    }

    if (!existingUser) {
      return errorResponse("User not found", 404);
    }

    await prisma.user.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/cas");
    return successResponse(null, "User status updated successfully");
  } catch (error) {
    return errorResponse("Error updating user status", error);
  }
}
