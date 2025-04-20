"use server";

import { requireAuth } from "@/app/api/utils";
import { UserType, UserRole, User, Prisma, BusinessType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/utils/log";
import { createWallet } from "../(root)/settings/wallet/actions";
import { sendVerificationRequestEmail } from "@/lib/emails/send-verification-request";
export type CompleteProfileData = {
  caNumber: string;
  gst: string;
  businessName?: string;
  businessRegistrationNumber?: string;
  businessAddress?: string;
  businessWebsite?: string;
  businessLocation?: string;
  businessEstablishedDate?: string;
  businessEmployeesSize?: string;
  businessKeyAchievements?: string;
  businessType?: BusinessType;
  businessAge?: string;
};

export async function validateGSTExistence(gst: string): Promise<boolean> {
  "use server";
  try {
    const existingBusinessWithGst = await prisma.business.findUnique({
      where: { gst: gst },
    });
    return existingBusinessWithGst !== null;
  } catch (error) {
    log({
      message: "Error validating GST existence",
      type: "error",
      data: error,
    });
    return false;
  }
}

export async function validateCINExistence(cin: string): Promise<boolean> {
  "use server";
  try {
    const existingBusinessWithCin = await prisma.business.findUnique({
      where: { cin: cin },
    });
    return existingBusinessWithCin !== null;
  } catch (error) {
    log({
      message: "Error validating CIN existence",
      type: "error",
      data: error,
    });
    return false;
  }
}
export async function completeProfile(
  data: CompleteProfileData
): Promise<{ user: User | null; error: string | null }> {
  try {
    const { error: authError, user } = await requireAuth();
    if (authError) {
      return { user: null, error: "Unauthorized" };
    }

    const {
      businessName,
      businessRegistrationNumber,
      businessAddress,
      businessWebsite,
      gst,
      businessLocation,
      businessEstablishedDate,
      businessEmployeesSize,
      businessKeyAchievements,
      businessType,
      businessAge,
    } = data;

    if (!businessName) {
      return { user: null, error: "Business name is required." };
    }
    if (!businessAddress) {
      return { user: null, error: "Business address is required." };
    }
    if (!gst) {
      return { user: null, error: "GST number is required." };
    }

    // Check if GST already exists before creating business
    const existingBusinessWithGst = await prisma.business.findUnique({
      where: { gst: gst },
    });
    if (existingBusinessWithGst) {
      return {
        user: null,
        error: "Business with this GST number already exists.",
      };
    }
    if (businessRegistrationNumber) {
      const existingBusinessWithCin = await prisma.business.findUnique({
        where: { cin: businessRegistrationNumber },
      });
      if (existingBusinessWithCin) {
        return {
          user: null,
          error: "Business with this Registration Number already exists.",
        };
      }
    }

    try {
      // Create business data object with proper type
      const businessData: Prisma.BusinessCreateInput = {
        name: businessName,
        cin: businessRegistrationNumber || null,
        gst: gst,
        address: businessAddress,
        website: businessWebsite || null,
        location: businessLocation || null,
        establishedDate: businessEstablishedDate
          ? new Date(businessEstablishedDate)
          : null,
        employeesSize: businessEmployeesSize || null,
        keyAchievements: businessKeyAchievements || null,
        businessType: businessType || BusinessType.PROPRIETOR_FIRM,
        ageOfTheOrganisation: businessAge || null,
      };

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          type: UserType.BUSINESS,
          role: UserRole.OWNER,
          isProfileComplete: true,
          business: {
            create: businessData,
          },
        },
        include: {
          business: true,
        },
      });

      // Access business ID from the included relation
      const businessId = updatedUser.business?.id || "";
      await createWallet(businessId);
      return { user: updatedUser, error: null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (prismaError: any) {
      console.log("prismaError :", prismaError);
      log({
        message: "Error completing business profile",
        type: "error",
        data: prismaError,
      });
      // Handle other potential Prisma errors if needed, for now generic error message
      return { user: null, error: "Failed to complete business profile." };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    log({
      message: "Error completing profile",
      type: "error",
      data: error,
    });
    return { user: null, error: "Failed to complete profile." };
  }
}

export async function resendVerificationRequestEmail(email: string) {
  try {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/callback/email?callbackUrl=${process.env.NEXTAUTH_URL}/register&token=fb80822cc7094966be1cdeb2ce8ac768a419c8067fc4a7bb601d4eb1516034aa&email=${email}&checksum=2219dba0eba4193aebfc866e94227c1ee73eec11a6a70eb634eeb19a9bcf1b82`;
    await sendVerificationRequestEmail({
      email: email,
      url: `${process.env.NEXTAUTH_URL}/verify?verification_url=${verificationUrl}`,
    });
  } catch (error) {
    log({
      message: "Error sending verification request email",
      type: "error",
      data: error,
    });
  }
}
