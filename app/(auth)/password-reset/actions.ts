"use server";

import { prisma } from "@/lib/prisma";
import { ApiResponse, errorResponse, successResponse } from "@/app/api/utils";
import { generateChecksum } from "@/lib/utils/generate-checksum";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Status } from "@prisma/client";
// Utility function to generate a random token
function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Function to send password reset email
async function sendPasswordResetEmail(email: string, resetUrl: string) {
  // In a production application, you would send a real email here
  // For now, we just log the reset URL for development purposes
  console.log("----------------------------------------");
  console.log("Password Reset URL:", resetUrl);
  console.log("----------------------------------------");

  // TODO: Implement actual email sending
  // Example using sendVerificationRequestEmail or similar function:
  // await sendEmail({
  //   to: email,
  //   subject: "Reset Your Password",
  //   html: `Click <a href="${resetUrl}">here</a> to reset your password`
  // });
}

/**
 * Requests a password reset for the given email
 */
export async function requestPasswordReset(
  email: string
): Promise<ApiResponse<null>> {
  try {
    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // For security reasons, don't reveal if the user exists or not
    if (!user) {
      // Silently succeed - we don't want to reveal if the email exists
      return successResponse(
        null,
        "If your email is registered, you will receive a reset link"
      );
    }

    // Generate a reset token
    const resetToken = generateResetToken();

    // Create expiration date (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store the reset token in the database
    await prisma.passwordReset.upsert({
      where: { userId: user.id },
      update: {
        token: resetToken,
        expiresAt,
      },
      create: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    });

    // Generate reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    // For added security, generate a checksum
    const checksum = generateChecksum(resetUrl);
    const secureResetUrl = `${resetUrl}&checksum=${checksum}`;

    // Send the reset email
    await sendPasswordResetEmail(email, secureResetUrl);

    return successResponse(
      null,
      "If your email is registered, you will receive a reset link"
    );
  } catch (error) {
    console.error("Error requesting password reset:", error);
    return errorResponse("Failed to process password reset request", error);
  }
}

/**
 * Verifies a password reset token
 */
export async function verifyResetToken(
  token: string,
  checksum: string
): Promise<ApiResponse<{ isValid: boolean; userId?: string }>> {
  try {
    // Validate the checksum
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
    const expectedChecksum = generateChecksum(resetUrl);

    if (checksum !== expectedChecksum) {
      return {
        success: false,
        message: "Invalid reset link",
      };
    }

    // Find the password reset record
    const passwordReset = await prisma.passwordReset.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!passwordReset) {
      return {
        success: false,
        message: "Invalid or expired reset token",
      };
    }

    return {
      success: true,
      message: "Token is valid",
    };
  } catch {
    return {
      success: false,
      message: "Failed to verify reset token",
    };
  }
}

/**
 * Resets a user's password using a valid token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<ApiResponse<null>> {
  try {
    // Find the password reset record
    const passwordReset = await prisma.passwordReset.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!passwordReset) {
      return {
        success: false,
        message: "Invalid or expired reset token",
      };
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await prisma.user.update({
      where: { id: passwordReset.userId },
      data: {
        password: hashedPassword,
        hasResetPassword: true,
        status: Status.ACTIVE,
        emailVerified: new Date(),
        isProfileComplete: true,
      },
    });

    // Delete the used reset token
    await prisma.passwordReset.delete({
      where: { id: passwordReset.id },
    });

    return {
      success: true,
      message: "Password reset successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to reset password",
      error: error as string,
    };
  }
}
