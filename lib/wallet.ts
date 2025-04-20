import { prisma } from "@/lib/prisma";

export interface WalletBalance {
  complianceBalance: number;
  chatBalance: number;
}

export interface DeductionResult {
  success: boolean;
  message?: string;
  remainingBalance?: number;
}

/**
 * Cost constants for different operations
 */
export const WALLET_COSTS = {
  COMPLIANCE_RUN: 1, // 1 credit per compliance run
  CHAT_MESSAGE: 1, // 1 credit per chat message
} as const;

/**
 * Get wallet balance for a given wallet ID
 */

/**
 * Deduct credits for compliance run
 */
export async function deductComplianceCredits(
  businessId: string,
  analysisId: string,
  projectId: string,
  userId: string,
  amount: number = WALLET_COSTS.COMPLIANCE_RUN
): Promise<DeductionResult> {
  try {
    const wallet = await prisma.wallet.findFirst({
      where: { businessId },
    });

    if (!wallet) {
      return { success: false, message: "Wallet not found" };
    }

    if (wallet.complianceBalance < amount) {
      return {
        success: false,
        message: "Insufficient compliance credits",
        remainingBalance: wallet.complianceBalance,
      };
    }

    const updatedWallet = await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        complianceBalance: wallet.complianceBalance - amount,
      },
    });

    // Record the transaction
    await prisma.walletTransaction.create({
      data: {
        amount: -amount,
        type: "WITHDRAWAL",
        walletId: wallet.id,
        metadata: {
          analysisId: analysisId,
          projectId: projectId,
          userId: userId,
        },
      },
    });

    return {
      success: true,
      remainingBalance: updatedWallet.complianceBalance,
    };
  } catch (error) {
    console.error("Error deducting compliance credits:", error);
    return { success: false, message: "Transaction failed" };
  }
}

/**
 * Deduct credits for chat/LLM usage
 */
export async function deductChatCredits(
  businessId: string,
  projectId: string,
  userId: string,
  amount: number = WALLET_COSTS.CHAT_MESSAGE
): Promise<DeductionResult> {
  try {
    const wallet = await prisma.wallet.findFirst({
      where: { businessId },
    });

    if (!wallet) {
      return { success: false, message: "Wallet not found" };
    }

    if (wallet.chatBalance < amount) {
      return {
        success: false,
        message: "Insufficient chat credits",
        remainingBalance: wallet.chatBalance,
      };
    }

    const updatedWallet = await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        chatBalance: wallet.chatBalance - amount,
      },
    });

    // Record the transaction
    await prisma.walletTransaction.create({
      data: {
        amount: -amount,
        type: "WITHDRAWAL",
        walletId: wallet.id,
        metadata: {
          projectId: projectId,
          userId: userId,
        },
      },
    });

    return {
      success: true,
      remainingBalance: updatedWallet.chatBalance,
    };
  } catch (error) {
    console.error("Error deducting chat credits:", error);
    return { success: false, message: "Transaction failed" };
  }
}

/**
 * Add credits to wallet (can be used for both compliance and chat)
 */
export async function addCredits(
  businessId: string,
  amount: number,
  type: "compliance" | "chat"
): Promise<DeductionResult> {
  try {
    const wallet = await prisma.wallet.findFirst({
      where: { businessId },
    });

    if (!wallet) {
      return { success: false, message: "Wallet not found" };
    }

    const updatedWallet = await prisma.wallet.update({
      where: { id: wallet.id },
      data:
        type === "compliance"
          ? { complianceBalance: wallet.complianceBalance + amount }
          : { chatBalance: wallet.chatBalance + amount },
    });

    // Record the transaction
    await prisma.walletTransaction.create({
      data: {
        amount: amount,
        type: "DEPOSIT",
        walletId: wallet.id,
      },
    });

    return {
      success: true,
      remainingBalance:
        type === "compliance"
          ? updatedWallet.complianceBalance
          : updatedWallet.chatBalance,
    };
  } catch (error) {
    console.error("Error adding credits:", error);
    return { success: false, message: "Transaction failed" };
  }
}
