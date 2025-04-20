"use server";

import { prisma } from "@/lib/prisma";
import {
  TemplateFile,
  TemplateStatus,
  AnalysisStatus,
  AuditAction,
  AuditCollection,
  Prisma,
  UserRole,
  FileStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { tasks } from "@trigger.dev/sdk/v3";
import { complianceAnalysisTask } from "@/trigger/compliance-analysis";
import { createAuditLog } from "@/app/(root)/audit-logs/actions";
import { requireAuth } from "@/app/api/utils";
import { ComplianceTestConfig } from "@/components/dashboard/projects/analysis/compliance-modal";
import { Bucket, s3deleteFile, s3uploadFile } from "@/lib/s3";
import { processLargeFileFromS3, processS3File } from "@/lib/excel";
import { TemplateField } from "@/types/template-fields";
import { toDate } from "@/lib/utils/date-utils";
import { getWalletBalance } from "@/app/(root)/settings/wallet/actions";
import path from "path";
import fs from "fs";
import { sendTeammateProjectInviteEmail } from "@/lib/emails/send-teammate-project-invite";

export const getProject = async (projectId: string) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const projectData = await tx.project.findUnique({
        where: {
          id: projectId,
        },
        include: {
          analyses: {
            include: {
              complianceResults: true,
            },
          },
        },
      });

      const projectTemplatesData = await tx.projectTemplate.findMany({
        where: {
          projectId,
        },
        include: {
          files: true,
          template: true,
        },
      });

      const projectMembersData = await tx.user.findMany({
        where: {
          projects: {
            some: {
              id: projectId,
            },
          },
        },
      });

      return {
        projectData,
        projectTemplatesData,
        projectMembersData,
      };
    });

    return result;
  } catch {
    return null;
  }
};

export const updateTemplateMappings = async (
  projectId: string,
  templateId: string,
  fileId: string,
  templateFileData: TemplateFile
) => {
  try {
    const { error, user } = await requireAuth();
    if (error) {
      return {
        status: false,
        message: "Unauthorized",
        error: error,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const templateFile = await tx.templateFile.update({
        where: { id: fileId },
        data: {
          name: templateFileData.name,
          size: templateFileData.size,
          uploadedById: user.id,
          projectTemplateId: templateId,
          status: FileStatus.SUCCESS,
        },
      });

      if (!templateFile) {
        throw new Error("Template file not found");
      }

      // const updatedTemplate = await tx.projectTemplate.update({
      //   where: { id: templateId },
      //   data: {
      //     fieldMappings: mappings,
      //     data: fileData,
      //     status: TemplateStatus.VERIFIED,
      //   },
      // });

      // Create audit log for file upload
      await createAuditLog({
        action: AuditAction.CREATE,
        collection: AuditCollection.TEMPLATE_FILE,
        message: `Uploaded file ${templateFile.name} for project template`,
        record: templateFile,
      });

      revalidatePath(`/projects/${projectId}`);
      return {
        status: true,
        message: "Template mappings updated successfully",
        result: templateFile,
      };
    });
    return {
      status: true,
      message: "Template mappings updated successfully",
      result: result,
    };
  } catch (error) {
    return {
      status: false,
      message: "Failed to update template mappings",
      error: error,
    };
  }
};

export const deleteTemplateFile = async (
  projectId: string,
  templateId: string,
  fileId: string
) => {
  try {
    const { error, user } = await requireAuth();
    if (error) {
      return {
        status: false,
        message: "Unauthorized",
        error: error,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const file = await tx.templateFile.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new Error("File not found");
      }

      await tx.templateFile.delete({
        where: { id: fileId },
      });

      await tx.projectTemplate.update({
        where: { id: templateId },
        data: { fieldMappings: {}, status: TemplateStatus.PENDING, data: [] },
      });

      const deleteResponse = await s3deleteFile(`${projectId}/${file.name}`);

      if (deleteResponse.$metadata.httpStatusCode !== 204) {
        throw new Error("Failed to delete file from S3");
      }

      // Create audit log for file deletion
      await createAuditLog({
        action: AuditAction.DELETE,
        userId: user.id,
        collection: AuditCollection.TEMPLATE_FILE,
        message: `Deleted file ${file.name} from project template`,
        record: file,
        businessId: user.businessId || undefined,
      });

      revalidatePath(`/projects/${projectId}`);
      return null;
    });

    return result;
  } catch (error) {
    return {
      status: false,
      message: "Failed to delete template file",
      error: error,
    };
  }
};

export const runComplianceTest = async (
  projectId: string,
  selectedTests: string[],
  thresholds: Record<string, ComplianceTestConfig>
) => {
  try {
    const { error, user } = await requireAuth();
    if (error) {
      return {
        status: false,
        message: "Unauthorized",
        error: error,
      };
    }

    const wallet = await getWalletBalance();

    if (wallet.data?.complianceBalance === 0) {
      return {
        status: false,
        message: "Insufficient balance for compliance test",
        error: "Insufficient balance",
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const analysis = await tx.analysis.create({
        data: {
          name: "Compliance Test",
          type: "COMPLIANCE",
          projectId: projectId,
          ranByUserId: user.id,
          status: AnalysisStatus.QUEUED,
          businessId: user.businessId,
        },
      });

      // trigger trigger.dev job
      const handle = await tasks.trigger<typeof complianceAnalysisTask>(
        "compliance-analysis",
        {
          analysisId: analysis.id,
          projectId,
          selectedTests,
          thresholds,
          userId: user.id,
        }
      );

      // Create audit log for analysis creation
      await createAuditLog({
        action: AuditAction.CREATE,
        userId: user.id,
        collection: AuditCollection.ANALYSIS,
        message: `Started compliance analysis for project`,
        record: analysis,
        metadata: { selectedTests, thresholds },
        businessId: user.businessId || undefined,
      });

      return handle;
    });

    return {
      status: true,
      message: "Analysis triggered successfully",
      result: result,
    };
  } catch (error) {
    return {
      status: false,
      message: "Failed to trigger analysis",
      error: error,
    };
  }
};

// Get analysis list without detailed results
export const getAnalysisList = async (projectId: string) => {
  try {
    const analyses = await prisma.analysis.findMany({
      where: {
        projectId,
      },
      orderBy: {
        lastRunAt: "desc",
      },
      // Only select minimal fields needed for the list view
      select: {
        id: true,
        name: true,
        status: true,
        type: true,
        createdAt: true,
        lastRunAt: true,
        metadata: true,
        // Get only the count of compliance results, not the actual data
        _count: {
          select: {
            complianceResults: true,
          },
        },
      },
    });

    return {
      status: true,
      message: "Analysis list fetched successfully",
      data: analyses,
    };
  } catch (error) {
    return {
      status: false,
      message: "Failed to fetch analysis list",
      error: error instanceof Error ? error.message : "Unknown error occurred",
      data: null,
    };
  }
};

// Original function, keeping for backwards compatibility
export const getAnalysisResults = async (projectId: string) => {
  try {
    const analyses = await prisma.analysis.findMany({
      where: {
        projectId,
      },
      orderBy: {
        lastRunAt: "desc",
      },
      include: {
        complianceResults: {
          orderBy: {
            startedAt: "desc",
          },
        },
      },
    });

    return {
      status: true,
      message: "Analysis results fetched successfully",
      data: analyses,
    };
  } catch (error) {
    return {
      status: false,
      message: "Failed to fetch analysis results",
      error: error instanceof Error ? error.message : "Unknown error occurred",
      data: null,
    };
  }
};

// Get detailed results for a specific analysis
export const getAnalysisDetail = async (analysisId: string) => {
  try {
    const analysis = await prisma.analysis.findUnique({
      where: {
        id: analysisId,
      },
      include: {
        complianceResults: {
          orderBy: {
            startedAt: "desc",
          },
        },
      },
    });

    if (!analysis) {
      return {
        status: false,
        message: "Analysis not found",
        data: null,
      };
    }

    return {
      status: true,
      message: "Analysis detail fetched successfully",
      data: analysis,
    };
  } catch (error) {
    return {
      status: false,
      message: "Failed to fetch analysis detail",
      error: error instanceof Error ? error.message : "Unknown error occurred",
      data: null,
    };
  }
};

export const getAvailableTeamMembers = async (
  projectId: string,
  searchQuery: string = "",
  roleFilter: string = "all"
) => {
  try {
    const { error, user } = await requireAuth();
    if (error) {
      return {
        status: false,
        message: "Unauthorized",
        error: error,
        data: [],
      };
    }

    // Get users from the same business who aren't already in the project team
    let whereClause: Prisma.UserWhereInput = {
      businessId: user.businessId,
      // Only include users who are not already in the project team
      NOT: {
        projects: {
          some: {
            id: projectId,
          },
        },
      },
    };

    // Add search filter if provided
    if (searchQuery) {
      whereClause = {
        ...whereClause,
        OR: [
          { name: { contains: searchQuery, mode: "insensitive" } },
          { email: { contains: searchQuery, mode: "insensitive" } },
        ],
      };
    }

    // Add role filter if provided
    if (roleFilter !== "all") {
      whereClause.role = roleFilter as UserRole;
    }

    const availableMembers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return {
      status: true,
      message: "Available team members fetched successfully",
      data: availableMembers,
    };
  } catch (error) {
    return {
      status: false,
      message: "Error fetching available team members",
      error: error,
      data: [],
    };
  }
};

export const addProjectTeamMembers = async (
  projectId: string,
  members: {
    email: string;
    id: string;
  }[]
) => {
  try {
    const { error, user } = await requireAuth();
    if (error) {
      return {
        status: false,
        message: "Unauthorized",
        error: error,
      };
    }

    if (!members.length) {
      return {
        status: false,
        message: "No members selected",
      };
    }

    const project = await prisma.project.update({
      where: {
        id: projectId,
        businessId: user.businessId, // Ensure the project belongs to the user's business
      },
      data: {
        team: {
          connect: members.map((member) => ({ id: member.id })),
        },
      },
      include: {
        team: true,
      },
    });

    for (const member of members) {
      await sendTeammateProjectInviteEmail({
        senderName: user.name,
        senderEmail: user.email,
        projectName: project.name,
        to: member.email,
        url: `${process.env.NEXTAUTH_URL}/projects/${projectId}`,
      });
    }

    // // trigger trigger.dev job // TODO: uncomment this when we have a way to send emails
    // const handle = await tasks.trigger<typeof sendProjectInvitesTask>(
    //   "send-project-invites",
    //   {
    //     projectId,
    //     memberIds,
    //     user: {
    //       name: user.name,
    //       email: user.email,
    //     },
    //   }
    // );
    // Create audit log for adding team members
    await createAuditLog({
      action: AuditAction.UPDATE,
      collection: AuditCollection.PROJECT,
      userId: user.id,
      message: `Added ${members.length} team member(s) to project ${project.name}`,
      record: { projectId, members },
      businessId: user.businessId || undefined,
    });

    // Revalidate the project page to reflect the changes
    revalidatePath(`/projects/${projectId}`);

    return {
      status: true,
      message: "Team members added successfully",
      data: project,
    };
  } catch (error) {
    return {
      status: false,
      message: "Error adding team members",
      error: error,
    };
  }
};

export const removeProjectTeamMember = async (
  projectId: string,
  memberId: string
) => {
  try {
    const { error, user } = await requireAuth();
    if (error) {
      return {
        status: false,
        message: "Unauthorized",
        error: error,
      };
    }

    // Get the project to check if the member being removed is the owner
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        businessId: user.businessId,
      },
      select: {
        createdById: true,
        name: true,
      },
    });

    if (!project) {
      return {
        status: false,
        message: "Project not found",
      };
    }

    // Prevent removing the project owner
    if (project.createdById === memberId) {
      return {
        status: false,
        message: "Cannot remove the project owner",
      };
    }

    // Update the project to disconnect the team member
    const updatedProject = await prisma.project.update({
      where: {
        id: projectId,
        businessId: user.businessId,
      },
      data: {
        team: {
          disconnect: [{ id: memberId }],
        },
      },
      include: {
        team: true,
      },
    });

    // Create audit log for removing the team member
    await createAuditLog({
      action: AuditAction.UPDATE,
      collection: AuditCollection.PROJECT,
      userId: user.id,
      message: `Removed team member from project ${project.name}`,
      record: { projectId, memberId },
      businessId: user.businessId || undefined,
    });

    // Revalidate the project page to reflect the changes
    revalidatePath(`/projects/${projectId}`);

    return {
      status: true,
      message: "Team member removed successfully",
      data: updatedProject,
    };
  } catch (error) {
    return {
      status: false,
      message: "Error removing team member",
      error: error,
    };
  }
};

export const uploadFile = async (
  projectId: string,
  templateId: string,
  file: File
) => {
  try {
    const { error, user } = await requireAuth();
    if (error) {
      return {
        status: false,
        message: "Unauthorized",
        error: error,
      };
    }

    // Check file size for logging
    const isLargeFile = file.size > 5 * 1024 * 1024; // 5MB threshold
    if (isLargeFile) {
      console.log(
        `Uploading large file (${(file.size / (1024 * 1024)).toFixed(2)}MB): ${file.name}`
      );
    }

    const template = await prisma.projectTemplate.findUnique({
      where: {
        id: templateId,
      },
    });

    if (!template) {
      throw new Error("Template not found");
    }

    const uploadResponse = await s3uploadFile(file, projectId);

    if (uploadResponse.$metadata.httpStatusCode !== 200) {
      throw new Error("Failed to upload file to S3");
    }

    const newFile = await prisma.templateFile.create({
      data: {
        name: file.name,
        size: file.size,
        uploadedById: user.id,
        projectTemplateId: templateId,
      },
    });

    // For large files, use a background job approach
    // This will allow the UI to continue while processing happens in the background
    const processHeadersPromise = (async () => {
      try {
        // Process headers with potential caching for large files
        const headers = await processS3File(
          Bucket || "",
          `${projectId}/${file.name}`
        );

        return headers || [];
      } catch (error) {
        console.error("Error processing file headers:", error);
        return [];
      }
    })();

    // Wait for the headers processing to complete, but with a timeout
    // This ensures we don't block the UI for too long
    const headers = await Promise.race([
      processHeadersPromise,
      // Set a timeout to return at least something to the client
      new Promise<string[]>((resolve) => {
        setTimeout(() => {
          // Return an empty array if processing takes too long
          // The UI can handle this gracefully
          resolve([]);
        }, 5000); // 5 second timeout
      }),
    ]);

    return {
      status: true,
      message: "File uploaded successfully",
      data: newFile,
      headers: headers || [],
    };
  } catch (error) {
    return {
      status: false,
      message: "Failed to upload file",
      error: error,
    };
  }
};

export const processUploadedFile = async (
  projectId: string,
  fileKey: string,
  headers: (string | undefined)[],
  fields: TemplateField[],
  mappings: Record<string, string>,
  templateId: string
) => {
  try {
    const { error } = await requireAuth();

    if (error) {
      return {
        status: false,
        message: "Unauthorized",
        error: error,
      };
    }

    // Update template mappings first to provide immediate feedback
    await prisma.projectTemplate.update({
      where: { id: templateId },
      data: {
        fieldMappings: mappings,
        status: TemplateStatus.UPLOADED,
      },
    });

    // Start processing the file but don't await it
    // This allows the function to return quickly while processing continues
    try {
      // Log the start of processing
      console.log(`Starting to process file: ${projectId}/${fileKey}`);
      console.log(`Expected headers: ${headers.filter(Boolean).join(", ")}`);

      // Create a variable to store all processed data
      let allData: Record<string, string | Date | number>[] = [];

      // Process the file in chunks to avoid memory issues
      processLargeFileFromS3(
        Bucket || "",
        `${projectId}/${fileKey}`,
        async (rows) => {
          // Skip processing if no rows
          if (!rows || rows.length === 0) return;

          console.log(`Processing batch of ${rows.length} rows`);

          // Process each batch of rows
          const processedRows = rows.map((row) => {
            const filteredRow: Record<string, string | Date | number> = {};

            // Make sure row object exists
            if (!row || typeof row !== "object") {
              console.warn("Invalid row data encountered:", row);
              return filteredRow;
            }

            for (const header of headers) {
              if (header) {
                const field = mappings[header];
                const fieldType = fields?.find((f) => f.name === header)?.type;

                // Ensure we get the value using a trimmed field name
                // Try different versions of the field name to be robust
                const fieldTrimmed = field?.trim();
                const value = row[fieldTrimmed] || row[field] || "";

                // Attempt to parse the value based on type
                if (fieldType === "date") {
                  // If parsing is successful, it's considered a date
                  filteredRow[header] = value ? toDate(value) : ""; // Save as date string
                } else if (fieldType === "number") {
                  // Handle case where value is "-" or empty
                  if (
                    value === "-" ||
                    value === "" ||
                    value === null ||
                    value === undefined
                  ) {
                    filteredRow[header] = 0;
                  } else {
                    const cleanedValue =
                      typeof value === "string"
                        ? value.replace(/,/g, "")
                        : String(value);
                    const parsed = parseFloat(cleanedValue);
                    // Check if the result is NaN and replace with 0
                    filteredRow[header] = isNaN(parsed) ? 0 : parsed;
                  }
                } else {
                  // For non-number fields, replace "-" with empty string
                  filteredRow[header] = value === "-" ? "" : value;
                }
              }
            }
            return filteredRow;
          });

          // Add processed rows to allData
          allData = [...allData, ...processedRows];

          // Update the template data after processing each batch
          try {
            await prisma.projectTemplate.update({
              where: { id: templateId },
              data: {
                data: allData,
                status: TemplateStatus.VERIFIED,
              },
            });
            console.log(
              `Updated template data with ${allData.length} total rows`
            );
          } catch (dbError) {
            console.error("Error updating project template:", dbError);
          }
        },
        async (totalRows) => {
          // This callback executes when all rows are processed
          console.log(`File processing complete. Processed ${totalRows} rows`);

          // Final update with completion status
          try {
            await prisma.projectTemplate.update({
              where: { id: templateId },
              data: {
                status: TemplateStatus.VERIFIED,
              },
            });

            await prisma.templateFile.updateMany({
              where: {
                projectTemplateId: templateId,
                name: fileKey,
              },
              data: {
                status: FileStatus.SUCCESS,
              },
            });
          } catch (finalError) {
            console.error("Error in final update:", finalError);
          }
        }
      ).catch((error) => {
        console.error("Error processing file:", error);
        // Update the file status to error if processing fails
        prisma.templateFile.updateMany({
          where: {
            projectTemplateId: templateId,
            name: fileKey,
          },
          data: {
            status: FileStatus.ERROR,
          },
        });
      });
    } catch (error) {
      console.error("Error starting file processing:", error);
      // Update the file status to error if processing fails to start
      await prisma.templateFile.updateMany({
        where: {
          projectTemplateId: templateId,
          name: fileKey,
        },
        data: {
          status: FileStatus.ERROR,
        },
      });
    }

    // Return success immediately without waiting for file processing
    return {
      status: true,
      message: "File processing started",
    };
  } catch (error) {
    return {
      status: false,
      message: "Failed to process file",
      error: error,
    };
  }
};

export const exportResults = async (analysisId: string) => {
  try {
    const { error, user } = await requireAuth();
    if (error) {
      return {
        status: false,
        message: "Unauthorized",
        error: error,
      };
    }

    // Get project info for naming the file
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      select: { name: true, project: { select: { name: true, id: true } } },
    });

    const projectName = analysis?.project?.name || analysisId;
    const safeProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, "_");

    // Get all compliance results with analysis data for this project
    const results = await prisma.complianceResult.findMany({
      where: {
        analysis: {
          id: analysisId,
        },
      },
      include: {
        analysis: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            createdAt: true,
            businessId: true,
          },
        },
      },
    });

    if (results.length === 0) {
      return {
        status: false,
        message: "No results found to export",
        error: "No results found",
      };
    }

    // Import the createComplianceResultsZip function from excel.ts
    const { createComplianceResultsZip } = await import("@/lib/excel");

    // Create the zip file with all results
    const zipFilePath = await createComplianceResultsZip(
      results,
      `${safeProjectName}-compliance`
    );

    // Import the s3uploadFromPath function
    const { s3uploadFromPath, s3getSignedUrl } = await import("@/lib/s3");

    // Define the S3 path, using the project ID and exports directory
    const s3Path = `projects/${analysis?.project?.id}/${analysisId}/exports`;

    // Upload the zip file to S3
    const { fileKey } = await s3uploadFromPath(zipFilePath, s3Path);

    // Generate a signed URL for the uploaded file (expires in 15 minutes)
    const signedUrl = await s3getSignedUrl(fileKey);

    // Create audit log for export
    await createAuditLog({
      action: AuditAction.CREATE,
      userId: user.id,
      collection: AuditCollection.ANALYSIS,
      message: `Exported compliance results for project ${projectName}`,
      businessId: user.businessId || undefined,
      metadata: { s3Path: fileKey, s3Url: signedUrl, expiryTime: "15 minutes" },
    });

    // Clean up the local zip file after upload
    try {
      if (fs.existsSync(zipFilePath)) {
        fs.unlinkSync(zipFilePath);
        console.log(
          `Temporary zip file deleted after S3 upload: ${zipFilePath}`
        );
      }
    } catch (cleanupError) {
      console.error("Error cleaning up local zip file:", cleanupError);
    }

    return {
      status: true,
      message: "Results exported successfully",
      data: {
        zipFilePath: signedUrl, // Use the signed URL instead of the direct S3 URL
        filename: path.basename(zipFilePath),
        s3Key: fileKey,
        s3Url: signedUrl, // Include the signed URL
      },
    };
  } catch (error) {
    return {
      status: false,
      message: "Failed to export results",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
