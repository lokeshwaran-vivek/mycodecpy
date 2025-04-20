"use server";

import { requireAuth } from "@/app/api/utils";
import { AuditAction, AuditCollection, Prisma, AuditLog } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse, ApiResponse } from "@/app/api/utils";

interface CreateAuditLogData {
  action: AuditAction;
  message?: string;
  collection?: AuditCollection;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  userId?: string;
  businessId?: string;
}

export async function createAuditLog({
  action,
  message,
  collection,
  record,
  metadata,
  userId,
  businessId,
}: CreateAuditLogData) {
  try {
    const { error, user } = await requireAuth();
    if (error) return errorResponse("Unauthorized", error);

    const auditLog = await prisma.auditLog.create({
      data: {
        action,
        userId: userId || user.id,
        message,
        collection,
        record,
        metadata,
        businessId: businessId || user.businessId,
      },
    });

    return successResponse(auditLog, "Audit log created successfully");
  } catch (error) {
    console.error("Error creating audit log:", error);
    return errorResponse("Error creating audit log", error);
  }
}

type AuditLogsResponse = {
  data: AuditLog[];
  totalPages: number;
  totalRecords: number;
};

export async function getAuditLogs({
  action,
  collection,
  startDate,
  endDate,
  search,
  page = 1,
  limit = 10,
}: {
  action?: AuditAction;
  collection?: AuditCollection;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<AuditLogsResponse>> {
  try {
    const { error, user } = await requireAuth();
    if (error) return errorResponse("Unauthorized", error);

    const where: Prisma.AuditLogWhereInput = {};

    // Only admins can see all logs, others see only their own
    if (user.role !== "ADMIN") {
      where.userId = user.id;
    }

    if (action) where.action = action;
    if (collection) where.collection = collection;
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      };
    }

    // Add search functionality
    if (search && search.trim() !== "") {
      where.OR = [
        { message: { contains: search, mode: "insensitive" } },
        {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return successResponse(
      {
        data: logs,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
      },
      "Audit logs fetched successfully",
    );
  } catch (error) {
    return errorResponse("Error fetching audit logs", error);
  }
}
