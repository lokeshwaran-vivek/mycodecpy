export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  ChartBar,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Wallet,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  getDashboardStats,
  getRecentActivity,
  getRecentAnalyses,
  getUserAndBusiness,
} from "./actions";
import { getWalletBalance } from "@/app/(root)/settings/wallet/actions";
import {
  ActivityItem,
  RecentActivity,
} from "@/components/dashboard/recent-activity";
import { AnalysisStatus } from "@prisma/client";
import WaitingForAdminApproval from "@/components/dashboard/waiting/WaitingForAdminApproval";
import CompleteProfile from "@/components/dashboard/waiting/CompleteProfile";
// Define the type for the analysis data
interface AnalysisData {
  id: string;
  title: string;
  project: string;
  progress: number;
  status: AnalysisStatus;
  results: {
    totalRecords: number;
    processedRecords: number;
    errorRecords: number;
  };
}

export default async function DashboardPage() {
  // Fetch all dashboard data in parallel
  const [stats, activities, analysesData, walletData, userAndBusinessData] =
    await Promise.all([
      getDashboardStats(),
      getRecentActivity(),
      getRecentAnalyses(),
      getWalletBalance(),
      getUserAndBusiness(),
    ]);

  // Safely handle analyses data
  const analyses = Array.isArray(analysesData) ? analysesData : [];
  const walletBalance = walletData.data;

  if (userAndBusinessData && userAndBusinessData.error) {
    return <div>Error: Getting user and business data</div>;
  }

  const user = userAndBusinessData?.user;
  const business = userAndBusinessData?.business;

  if (!user?.isProfileComplete) {
    return <CompleteProfile />;
  }

  // if (!business?.verified) {
  //   return <WaitingForAdminApproval />;
  // }

  return (
    <div className="flex-1 space-y-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.clients?.total}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.clients?.newThisMonth} new this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analyses Run</CardTitle>
            <ChartBar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.analyses?.total}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.analyses?.newThisWeek} this week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Compliance Credits
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {walletBalance?.complianceBalance || 0}
            </div>
            <p className="text-xs text-muted-foreground">Available balance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat Credits</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {walletBalance?.chatBalance || 0}
            </div>
            <p className="text-xs text-muted-foreground">Available balance</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Activity */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity
              activities={activities as unknown as ActivityItem[]}
            />
          </CardContent>
        </Card>

        {/* Recent Analyses */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Analyses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {analyses.map((analysis: AnalysisData) => (
                <div key={analysis.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{analysis.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {analysis.project}
                      </p>
                    </div>
                    <Badge
                      variant={
                        analysis.status === "COMPLETED"
                          ? "default"
                          : "secondary"
                      }
                      className="capitalize"
                    >
                      {analysis.status.toLowerCase().replace("_", " ")}
                    </Badge>
                  </div>
                  <Progress value={analysis.progress * 100} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-1">
                      <FileSpreadsheet className="h-3 w-3" />
                      <span>Total: {analysis.results.totalRecords}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>{analysis.results.processedRecords}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-red-600" />
                      <span>{analysis.results.errorRecords}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
