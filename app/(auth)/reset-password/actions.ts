"use server";

import { verifyResetToken as verifyToken, resetPassword as resetPass } from "@/app/(auth)/password-reset/actions";
import { ApiResponse } from "@/app/api/utils";

export async function verifyResetToken(token: string, checksum: string): Promise<ApiResponse<{ isValid: boolean; userId?: string }>> {
  return verifyToken(token, checksum);
}

export async function resetPassword(token: string, newPassword: string): Promise<ApiResponse<null>> {
  return resetPass(token, newPassword);
} 