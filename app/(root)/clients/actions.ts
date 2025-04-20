"use server";

import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  validateQueryParam,
  successResponse,
  errorResponse,
  ApiResponse,
} from "@/app/api/utils";
import { Client, ClientClass, Status, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { generateCode } from "@/lib/utils";
import { log } from "@/lib/utils/log";

export async function getClients(
  query: string,
  page: number,
  pageSize: number,
  tab?: string
): Promise<
  ApiResponse<{
    clients: Client[];
    totalPages: number;
    currentPage: number;
  } | null>
> {
  try {
    const { error, user } = await requireAuth();
    if (error) return errorResponse("Unauthorized", error);

    let whereClause: Prisma.ClientWhereInput = {
      businessId: user.businessId,
    };

    const searchQuery = validateQueryParam(query);
    if (searchQuery) {
      whereClause = {
        OR: [
          { name: { contains: searchQuery, mode: "insensitive" } },
          { email: { contains: searchQuery, mode: "insensitive" } },
          { contactPersonName: { contains: searchQuery, mode: "insensitive" } },
          {
            contactPersonEmail: { contains: searchQuery, mode: "insensitive" },
          },
          {
            taxRegistrationNumber: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
          {
            regulatoryLicenseNumber: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
        ],
      };
    }
    if (tab !== "all") {
      if (tab === "active") {
        whereClause.status = Status.ACTIVE;
      } else if (tab === "inactive") {
        whereClause.status = Status.INACTIVE;
      }
    }
    const clients = await prisma.client.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const totalClientsCount = await prisma.client.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalClientsCount / pageSize);

    return successResponse(
      { clients, totalPages, currentPage: page },
      "Clients fetched successfully"
    );
  } catch (error) {
    log({
      message: "Error fetching clients:",
      type: "error",
      data: error,
    });
    return errorResponse("Internal Server Error", error);
  }
}

export async function createClient(
  data: Partial<Client>
): Promise<ApiResponse<Client | unknown>> {
  const { error, user } = await requireAuth();
  if (error) return errorResponse("Unauthorized", error);

  const { name, email } = data;

  // Validate required fields
  if (!name || !email) {
    return errorResponse("Missing required fields", 400);
  }

  try {
    // Check for existing client with the same name in this business
    const existingClient = await prisma.client.findFirst({
      where: {
        businessId: user.businessId,
        name,
      },
    });

    if (existingClient) {
      return errorResponse(
        "A client with this name already exists in your business",
        400
      );
    }

    const business = await prisma.business.findUnique({
      where: {
        id: user.businessId || "",
      },
    });

    if (!business) {
      return errorResponse("Business not found", 404);
    }

    let code: string;
    code = generateCode(
      business.name.split(" ").length === 1
        ? business.name.slice(0, 3)
        : business.name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
    );

    const existingClientWithCode = await prisma.client.findFirst({
      where: {
        businessId: user.businessId,
        code,
      },
    });

    // retry if code already exists
    if (existingClientWithCode) {
      code = generateCode(
        business.name.split(" ").length === 1
          ? business.name.slice(0, 3)
          : business.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
      );
    }

    const client = await prisma.client.create({
      data: {
        name,
        code,
        email,
        class: data.class || ClientClass.PRIVATE,
        taxRegistrationNumber: data.taxRegistrationNumber,
        regulatoryLicenseNumber: data.regulatoryLicenseNumber,
        clientRiskCategory: data.clientRiskCategory,
        address: data.address,
        contactPersonName: data.contactPersonName,
        contactPersonEmail: data.contactPersonEmail,
        status: Status.ACTIVE,
        businessId: user.businessId,
        createdById: user.id,
      },
    });

    revalidatePath("/clients");
    return successResponse(client, "Client created successfully");
  } catch (error) {
    log({
      message: "Error creating client:",
      type: "error",
      data: error,
    });
    return errorResponse("Internal Server Error", error);
  }
}

export async function updateClient(
  id: string,
  data: Partial<Client>
): Promise<ApiResponse<Client | unknown>> {
  const { error, user } = await requireAuth();
  if (error) return errorResponse("Unauthorized", error);

  const client = await prisma.client.update({
    where: { id, businessId: user.businessId },
    data,
  });

  revalidatePath("/clients");
  return successResponse(client, "Client updated successfully");
}

export async function deleteClient(id: string) {
  const { error, user } = await requireAuth();
  if (error) return errorResponse("Unauthorized", error);

  await prisma.client.delete({ where: { id, businessId: user.businessId } });
  revalidatePath("/clients");
  return successResponse(null, "Client deleted successfully");
}

export async function getClientById(id: string) {
  const { error, user } = await requireAuth();
  if (error) return errorResponse("Unauthorized", error);

  const client = await prisma.client.findUnique({
    where: { id, businessId: user.businessId },
  });

  return successResponse(client, "Client fetched successfully");
}
