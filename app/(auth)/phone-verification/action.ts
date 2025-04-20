"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateUserPhoneVerification() {
  try {
    const { user, error } = await requireAuth();

    if (error) {
      return { success: false, error: error };
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerified: true,
      },
    });

    return { success: true, data: updatedUser };
  } catch (error) {
    return { success: false, error: error };
  }
}
