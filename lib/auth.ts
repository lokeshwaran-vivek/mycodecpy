import { getServerSession } from "next-auth";
import authOptions from "@/app/api/auth/authOptions";
import { CustomUser } from "@/lib/types";
import { errorResponse } from "@/app/api/utils";
import { signOut } from "next-auth/react";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }
  return session.user as CustomUser;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    signOut();
    return {
      error: errorResponse("Unauthorized", 401),
    };
  }

  return { user };
}
