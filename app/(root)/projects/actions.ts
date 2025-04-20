"use server";

import {
  ApiResponse,
  successResponse,
  errorResponse,
  requireAuth,
  validateQueryParam,
} from "@/app/api/utils";
import { prisma } from "@/lib/prisma";
import {
  Prisma,
  Project,
  Client,
  TemplateStatus,
  ProjectStatus,
  AuditAction,
  AuditCollection,
  ProjectType,
} from "@prisma/client";
import { generateCode } from "@/lib/utils";
import { createAuditLog } from "@/app/(root)/audit-logs/actions";

export type ProjectWithClient = Project & {
  client: Client;
};

export async function getProjects(
  query: string,
  page: number,
  pageSize: number
): Promise<
  ApiResponse<{
    projects: ProjectWithClient[];
    totalPages: number;
    currentPage: number;
  } | null>
> {
  try {
    const { error, user } = await requireAuth();
    if (error) return errorResponse("Unauthorized", error);

    let whereClause: Prisma.ProjectWhereInput = {
      businessId: user?.businessId,
      team: {
        some: {
          id: user.id,
        },
      },
    };

    const searchQuery = validateQueryParam(query);
    if (searchQuery) {
      whereClause = {
        OR: [
          { name: { contains: searchQuery, mode: "insensitive" } },
          { code: { contains: searchQuery, mode: "insensitive" } },
        ],
      };
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        status: true,
        progress: true,
        createdAt: true,
        updatedAt: true,
        clientId: true,
        createdById: true,
        businessId: true,
        client: true,
        type: true,
        period: true,
        materiality: true,
        risk: true,
      },
    });
    const totalCount = await prisma.project.count({ where: whereClause });
    const totalPages = Math.ceil(totalCount / pageSize);

    return successResponse(
      { projects, totalPages, currentPage: page },
      "Projects fetched successfully"
    );
  } catch (error) {
    return errorResponse("Error fetching projects", error);
  }
}

export async function getProjectById(id: string) {
  try {
    const { error, user } = await requireAuth();
    if (error) return errorResponse("Unauthorized", error);

    const project = await prisma.project.findUnique({
      where: { id, businessId: user.businessId },
      include: {
        client: true,
        createdBy: true,
        team: true,
      },
    });

    return successResponse(project, "Project fetched successfully");
  } catch (error) {
    return errorResponse("Error fetching project", error);
  }
}

export type ProjectCreateData = {
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  clientId: string;
  teamMembers: string[];
  createdById: string;
  type: ProjectType;
  period: string;
  materiality: string;
  risk: string;
};

export async function createProject(
  data: ProjectCreateData
): Promise<ApiResponse<Project | null>> {
  try {
    const { error, user } = await requireAuth();
    if (error) return errorResponse("Unauthorized", error);

    const teamMembers: { id: string }[] = [];
    data.teamMembers?.map((id: string) => {
      teamMembers.push({ id });
    });
    teamMembers.push({ id: user.id });

    let project: Project | null = null;
    await prisma.$transaction(
      async (tx) => {
        const client = await tx.client.findUnique({
          where: {
            id: data.clientId,
          },
        });

        if (!client) {
          throw new Error("Client not found");
        }

        let code: string;

        code = generateCode(
          client.name.split(" ").length === 1
            ? client.name.slice(0, 3)
            : client.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
        );

        const existingProjectWithCode = await tx.project.findFirst({
          where: {
            businessId: user.businessId,
            code,
          },
        });

        // retry if code already exists
        if (existingProjectWithCode) {
          code = generateCode(
            client.name.split(" ").length === 1
              ? client.name.slice(0, 3)
              : client.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
          );
        }

        project = await tx.project.create({
          data: {
            client: {
              connect: {
                id: data.clientId,
              },
            },
            Business: {
              connect: {
                id: user.businessId || "",
              },
            },
            createdBy: {
              connect: {
                id: user.id,
              },
            },
            team: {
              connect: teamMembers,
            },
            progress: 0,
            status: ProjectStatus.IN_PROGRESS,
            description: data.description,
            code,
            name: data.name,
            type: data.type,
            period: data.period,
            materiality: data.materiality,
            risk: data.risk,
          },
          include: {
            client: true,
          },
        });

        // Create audit log for project creation
        await createAuditLog({
          action: AuditAction.CREATE,
          collection: AuditCollection.PROJECT,
          userId: user.id,
          message: `Created project ${project.name}`,
          record: project,
          businessId: user.businessId || undefined,
        });

        if (!project) {
          throw new Error("Project creation failed");
        }
        const templates = await tx.template.findMany();

        const projectTemplates = await tx.projectTemplate.createMany({
          data: templates.map((template) => ({
            projectId: project?.id || "",
            templateId: template.id,
            status: TemplateStatus.PENDING,
          })),
        });
        return projectTemplates;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return successResponse(project, "Project created successfully");
  } catch (error) {
    return errorResponse("Error creating project", error);
  }
}

export async function updateProject(id: string, data: ProjectCreateData) {
  try {
    const { error, user } = await requireAuth();
    if (error) return errorResponse("Unauthorized", error);

    const project = await prisma.project.update({
      where: { id: id },
      data,
    });

    // Create audit log for project update
    await createAuditLog({
      action: AuditAction.UPDATE,
      collection: AuditCollection.PROJECT,
      userId: user.id,
      message: `Updated project ${project.name}`,
      record: project,
      businessId: user.businessId || undefined,
    });

    return successResponse(project, "Project updated successfully");
  } catch (error) {
    return errorResponse("Error updating project", error);
  }
}

export async function deleteProject(id: string) {
  try {
    const { error, user } = await requireAuth();
    if (error) return errorResponse("Unauthorized", error);

    const project = await prisma.project.findUnique({
      where: { id, businessId: user.businessId },
    });

    if (!project) {
      return errorResponse("Project not found", null);
    }

    await prisma.project.delete({
      where: { id, businessId: user.businessId },
    });

    // Create audit log for project deletion
    await createAuditLog({
      action: AuditAction.DELETE,
      collection: AuditCollection.PROJECT,
      userId: user.id,
      message: `Deleted project ${project.name}`,
      record: project,
      businessId: user.businessId || undefined,
    });

    return successResponse(null, "Project deleted successfully");
  } catch (error) {
    return errorResponse("Error deleting project", error);
  }
}
