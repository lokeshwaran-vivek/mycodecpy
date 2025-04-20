"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/utils/log";
import { Prisma } from "@prisma/client";

export const getUserAndBusiness = async () => {
  try {
    const { error: authError, user } = await requireAuth();
    if (authError) {
      return { error: authError };
    }
    const businessId = user.businessId;
    if (!businessId) {
      return { error: "Business ID not found" };
    }
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    return { user, business };
  } catch (error) {
    log({
      message: "Error fetching user and business:",
      type: "error",
      data: error,
    });
  }
};

export const getDashboardStats = async () => {
  const { error: authError, user } = await requireAuth();
  if (authError) {
    return { error: authError };
  }
  try {
    const whereClause = {
      businessId: user.businessId,
    };

    const [
      totalClients,
      recentClients,
      totalAnalyses,
      recentAnalyses,
      complianceIssues,
      complianceScore,
    ] = await Promise.all([
      // Total clients
      prisma.client.count({
        where: { businessId: user.businessId, status: "ACTIVE" },
      }),

      // New clients this month
      prisma.client.count({
        where: {
          ...whereClause,
          status: "ACTIVE",
          createdAt: {
            gte: new Date(new Date().setDate(1)), // First day of current month
          },
        },
      }),

      // Total analyses
      prisma.analysis.count({
        where: { ...whereClause },
      }),

      // Recent analyses this week
      prisma.analysis.count({
        where: {
          ...whereClause,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),

      // Compliance issues
      prisma.complianceResult.count({
        where: {
          analysis: {
            businessId: user.businessId,
          },
          status: {
            not: "FAILED",
          },
          results: {
            path: ["issues"],
            not: Prisma.JsonNull,
          },
        },
      }),

      // Calculate average compliance score from completed analyses
      prisma.complianceResult.aggregate({
        where: {
          analysis: {
            businessId: user.businessId,
          },
          status: "COMPLETED",
        },
        _avg: {
          threshold: true,
        },
      }),
    ]);

    // Calculate compliance score as percentage
    const avgComplianceScore = complianceScore._avg.threshold || 0;
    const scorePercentage = Math.round(avgComplianceScore);

    return {
      clients: {
        total: totalClients,
        newThisMonth: recentClients,
      },
      analyses: {
        total: totalAnalyses,
        newThisWeek: recentAnalyses,
      },
      compliance: {
        issues: complianceIssues,
        score: scorePercentage,
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      clients: { total: 0, newThisMonth: 0 },
      analyses: { total: 0, newThisWeek: 0 },
      compliance: { issues: 0, score: 0 },
    };
  }
};

export const getRecentActivity = async (limit = 5) => {
  try {
    const { error: authError, user } = await requireAuth();
    if (authError) {
      return { error: authError };
    }
    const whereClause = {
      businessId: user.businessId,
    };
    // Fetch recent activities from different models and combine them
    const [recentAnalyses, recentAuditLogs, recentProjects] = await Promise.all(
      [
        // Recent analyses
        prisma.analysis.findMany({
          where: {
            ...whereClause,
            status: {
              in: ["COMPLETED", "FAILED"],
            },
          },
          include: {
            project: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            lastRunAt: "desc",
          },
          take: limit,
        }),

        // Recent audit logs
        prisma.auditLog.findMany({
          where: {
            ...whereClause,
          },
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: limit,
        }),

        // Recent projects
        prisma.project.findMany({
          where: { ...whereClause },
          include: {
            client: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: limit,
        }),
      ]
    );

    // Transform analyses
    const analysisActivities = recentAnalyses.map((analysis) => ({
      id: analysis.id,
      title:
        analysis.status === "COMPLETED"
          ? "Analysis Completed"
          : "Analysis Failed",
      description: `${analysis.name} - ${analysis.project.name}`,
      time: analysis.lastRunAt || analysis.updatedAt,
      type: "analysis",
      status: analysis.status,
    }));

    // Transform audit logs
    const auditActivities = recentAuditLogs.map((log) => ({
      id: log.id,
      title: `${log.action} ${log.collection || "Record"}`,
      description: log.message || `By ${log.user.name}`,
      time: log.createdAt,
      type: "audit",
      status: log.action,
    }));

    // Transform projects
    const projectActivities = recentProjects.map((project) => ({
      id: project.id,
      title: `Project ${project.status === "IN_PROGRESS" ? "Updated" : project.status}`,
      description: `${project.name} - ${project.client.name}`,
      time: project.updatedAt,
      type: "project",
      status: project.status,
    }));

    // Combine all activities and sort by time
    const allActivities = [
      ...analysisActivities,
      ...auditActivities,
      ...projectActivities,
    ]
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, limit);

    return allActivities;
  } catch (error) {
    log({
      message: "Error fetching recent activity:",
      type: "error",
    });
    console.error("Error fetching recent activity:", error);
    return [];
  }
};

export const getRecentAnalyses = async (limit = 3) => {
  try {
    const { error: authError, user } = await requireAuth();
    if (authError) {
      return { error: authError };
    }

    const whereClause = {
      businessId: user.businessId,
    };

    const analyses = await prisma.analysis.findMany({
      where: { ...whereClause },
      include: {
        project: {
          select: {
            name: true,
          },
        },
        complianceResults: {
          take: 1,
          orderBy: {
            startedAt: "desc",
          },
          select: {
            results: true,
          },
        },
      },
      orderBy: {
        lastRunAt: "desc",
      },
      take: limit,
    });

    return analyses.map((analysis) => {
      // Calculate processed and error records from results
      let totalRecords = 0;
      let processedRecords = 0;
      let errorRecords = 0;

      if (
        analysis.complianceResults.length > 0 &&
        analysis.complianceResults[0].results
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = analysis.complianceResults[0].results as any;
        totalRecords = results.totalRecords || 0;
        processedRecords = results.processedRecords || 0;
        errorRecords = results.errorRecords || 0;
      }

      return {
        id: analysis.id,
        title: analysis.name,
        project: analysis.project.name,
        progress: analysis.progress,
        status: analysis.status,
        results: {
          totalRecords,
          processedRecords,
          errorRecords,
        },
      };
    });
  } catch (error) {
    log({
      message: "Error fetching recent analyses:",
      type: "error",
      data: error,
    });
    return [];
  }
};
