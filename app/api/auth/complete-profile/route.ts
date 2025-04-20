import { prisma } from "@/lib/prisma";
import { requireAuth } from "../../utils";
import { UserRole, UserType } from "@prisma/client";
import { NextResponse } from "next/server";
export async function POST(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const {
      type,
      caNumber,
      businessName,
      businessRegistrationNumber,
      businessAddress,
      businessWebsite,
    } = await request.json();

    const userType =
      type === "business" ? UserType.BUSINESS : UserType.INDIVIDUAL;

    if (userType === UserType.BUSINESS) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          type: userType,
          role: UserRole.OWNER,
          business: {
            create: {
              name: businessName,
              cin: businessRegistrationNumber,
              gst: caNumber,
              address: businessAddress,
              website: businessWebsite,
            },
          },
          isProfileComplete: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser,
      });
    }

    if (userType === UserType.INDIVIDUAL) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          type: userType,
          isProfileComplete: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser,
      });
    }

    return NextResponse.json({
      success: false,
      message: "Invalid profile type",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Internal Server Error",
      error: error,
    });
  }
}
