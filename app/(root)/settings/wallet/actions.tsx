"use server";
import {
  requireAuth,
  successResponse,
  errorResponse,
  ApiResponse,
} from "@/app/api/utils";
import { prisma } from "@/lib/prisma";
import { WalletBalance } from "@/lib/wallet";
import { WalletTransaction } from "@prisma/client";

export async function createWallet(businessId: string) {
  try {
    const wallet = await prisma.wallet.findFirst({
      where: { businessId },
    });

    if (wallet) {
      return wallet;
    }

    const newWallet = await prisma.wallet.create({
      data: {
        businessId,
        complianceBalance: 0,
        chatBalance: 0,
      },
    });

    return newWallet;
  } catch (error) {
    console.error("Error creating wallet:", error);
    return null;
  }
}

export async function getWalletBalance(): Promise<ApiResponse<WalletBalance>> {
  try {
    const { user } = await requireAuth();

    if (!user) {
      return errorResponse("Unauthorized", "Unauthorized");
    }

    const businessId = user.businessId;

    if (!businessId) {
      return errorResponse("Business not found", "Business not found");
    }
    const wallet = await prisma.wallet.findFirst({
      where: { businessId },
    });

    if (!wallet) {
      await createWallet(businessId);
    }

    return wallet
      ? successResponse(
          {
            complianceBalance: wallet.complianceBalance,
            chatBalance: wallet.chatBalance,
          },
          "Wallet balance fetched successfully"
        )
      : errorResponse("Wallet not found", "Wallet not found");
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return errorResponse(
      "Error fetching wallet balance",
      "Error fetching wallet balance"
    );
  }
}

export async function getTransactions(
  limit: number = 10,
  page: number = 1
): Promise<ApiResponse<{ transactions: WalletTransaction[]; total: number }>> {
  try {
    const { user } = await requireAuth();
    if (!user) {
      return errorResponse("Unauthorized", "Unauthorized");
    }
    const businessId = user.businessId;
    if (!businessId) {
      return errorResponse("Business not found", "Business not found");
    }

    // Get total count
    const total = await prisma.walletTransaction.count({
      where: { wallet: { businessId } },
    });

    // Get paginated transactions
    const transactions = await prisma.walletTransaction.findMany({
      where: { wallet: { businessId } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return successResponse(
      {
        transactions,
        total,
      },
      "Transactions fetched successfully"
    );
  } catch (error) {
    return errorResponse("Error fetching transactions", error);
  }
}
