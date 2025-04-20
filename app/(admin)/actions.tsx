"use server";

import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";

// Get all businesses with pagination and search
export async function getBusinesses({
  page = 1,
  limit = 10,
  search = "",
  status = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  const skip = (page - 1) * limit;
  
  const where = search
    ? {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
      }
    : {};

  const [businesses, total] = await Promise.all([
    prisma.business.findMany({
      where: {
        ...where,
        status: status ? status === "all" ? undefined : { equals: status as Status } : undefined,
      },
      skip,
      take: limit,
      include: {
        employees: {
          select: {
            id: true,
          },
        },
        Wallet: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.business.count({ where }),
  ]);

  return {
    businesses,
    total,
    pages: Math.ceil(total / limit),
  };
}

// Get a single business by ID with detailed information
export async function getBusinessById(id: string) {
  return prisma.business.findUnique({
    where: { id },
    include: {
      employees: true,
      Wallet: true,
    },
  });
}

// Toggle business status (active/inactive)
export async function toggleBusinessStatus(id: string) {
  const business = await prisma.business.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!business) {
    throw new Error("Business not found");
  }

  const newStatus = business.status === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;

  return prisma.business.update({
    where: { id },
    data: { status: newStatus },
  });
}

// Add wallet balance to a business
export async function addWalletBalance({
  businessId,
  amount,
  type,
}: {
  businessId: string;
  amount: number;
  type: "complianceBalance" | "chatBalance";
}) {
  // First, check if wallet exists
  const wallet = await prisma.wallet.findFirst({
    where: { businessId },
  });

  if (!wallet) {
    // Create wallet if it doesn't exist
    return prisma.wallet.create({
      data: {
        businessId,
        [type]: amount,
      },
    });
  }

  // Update wallet if it exists
  return prisma.wallet.update({
    where: { id: wallet.id },
    data: {
      [type]: { increment: amount },
      WalletTransaction: {
        create: {
          amount,
          type: "DEPOSIT",
          metadata: { note: `Admin added ${type}` },
        },
      },
    },
  });
}
