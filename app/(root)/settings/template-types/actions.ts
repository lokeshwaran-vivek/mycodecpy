"use server";

import {
  ITEMS_PER_PAGE,
  ApiResponse,
  requireAuth,
  successResponse,
  errorResponse,
} from "@/app/api/utils";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { Template } from "@prisma/client";

type TemplateTypeResponse = {
  data: Template[];
  totalPages: number;
};

export async function getTemplateTypes(
  search?: string,
  page: number = 1,
  pageSize: number = ITEMS_PER_PAGE,
): Promise<ApiResponse<TemplateTypeResponse>> {
  try {
    const { user } = await requireAuth();
    if (!user) {
      return errorResponse("Unau  thorized", "Unauthorized");
    }
    const where: Prisma.TemplateWhereInput = {};

    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    const templateTypes = await prisma.template.findMany({
      where: where,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const total = await prisma.template.count({
      where: where,
    });
    const totalPages = Math.ceil(total / pageSize);
    return successResponse(
      {
        data: templateTypes,
        totalPages,
      },
      "Template types fetched successfully",
    );
  } catch (error) {
    return errorResponse("Error fetching template types", error);
  }
}

export async function createTemplateType(template: Prisma.TemplateCreateInput) {
  try {
    const { user } = await requireAuth();
    if (!user) {
      return errorResponse("Unauthorized", "Unauthorized");
    }
    const templateType = await prisma.template.create({
      data: template,
    });
    revalidatePath("/settings/template-types");
    return successResponse(templateType, "Template type created successfully");
  } catch (error) {
    return errorResponse("Error creating template type", error);
  }
}

export async function updateTemplateType(
  id: string,
  template: Prisma.TemplateUpdateInput,
) {
  try {
    const { user } = await requireAuth();
    if (!user) {
      return errorResponse("Unauthorized", "Unauthorized");
    }
    const templateType = await prisma.template.update({
      where: { id },
      data: template,
    });
    revalidatePath("/settings/template-types");
    return successResponse(templateType, "Template type updated successfully");
  } catch (error) {
    return errorResponse("Error updating template type", error);
  }
}

export async function deleteTemplateType(id: string) {
  try {
    const { user } = await requireAuth();
    if (!user) {
      return errorResponse("Unauthorized", "Unauthorized");
    }
    await prisma.template.delete({
      where: { id },
    });
    revalidatePath("/settings/template-types");
    return successResponse("Template type deleted successfully");
  } catch (error) {
    return errorResponse("Error deleting template type", error);
  }
}
