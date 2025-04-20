"use server";

import { requestPasswordReset as requestReset } from "@/app/(auth)/password-reset/actions";
import { ApiResponse } from "@/app/api/utils";

export async function requestPasswordReset(email: string): Promise<ApiResponse<null>> {
  return requestReset(email);
} 