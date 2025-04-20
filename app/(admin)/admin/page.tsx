import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ArrowDownRight, ArrowUpRight, Building2, DollarSign, UserIcon, Users } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Status, UserRole } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

type StatusCounts = {
  [key in Status]?: number;
};

type RoleCounts = {
  [key in UserRole]?: number;
};

async function getStats() {
  const currentDate = new Date();
  const thirtyDaysAgo = new Date(currentDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sixtyDaysAgo = new Date(currentDate);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [
    totalUsers,
    totalBusinesses,
    newUsersLast30Days,
    newUsersLast60to30Days,
    newBusinessesLast30Days,
    newBusinessesLast60to30Days,
    recentUsers,
    recentBusinesses,
    walletSummary,
    businessesByStatus,
    usersByRole,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.business.count(),
    prisma.user.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo,
        },
      },
    }),
    prisma.business.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),
    prisma.business.count({
      where: {
        createdAt: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo,
        },
      },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        business: true,
      },
    }),
    prisma.business.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    }),
    prisma.wallet.aggregate({
      _sum: {
        complianceBalance: true,
        chatBalance: true,
      },
    }),
    prisma.business.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    }),
    prisma.user.groupBy({
      by: ['role'],
      _count: {
        _all: true,
      },
    }),
  ]);

  // Calculate growth rates
  const userGrowthRate = newUsersLast60to30Days 
    ? ((newUsersLast30Days - newUsersLast60to30Days) / newUsersLast60to30Days) * 100
    : 0;

  const businessGrowthRate = newBusinessesLast60to30Days 
    ? ((newBusinessesLast30Days - newBusinessesLast60to30Days) / newBusinessesLast60to30Days) * 100
    : 0;

  // Format status counts
  const statusCounts: StatusCounts = {};
  businessesByStatus.forEach(item => {
    statusCounts[item.status as Status] = item._count._all;
  });

  // Format role counts
  const roleCounts: RoleCounts = {};
  usersByRole.forEach(item => {
    roleCounts[item.role as UserRole] = item._count._all;
  });

  return {
    totalUsers,
    totalBusinesses,
    newUsersLast30Days,
    newBusinessesLast30Days,
    userGrowthRate,
    businessGrowthRate,
    recentUsers,
    recentBusinesses,
    totalComplianceBalance: walletSummary._sum.complianceBalance || 0,
    totalChatBalance: walletSummary._sum.chatBalance || 0,
    statusCounts,
    roleCounts,
  };
}

export default async function AdminPage() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your platform metrics and activity.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/businesses/new">Add Business</Link>
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <UserIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{stats.newUsersLast30Days} new in last 30 days</span>
                  {stats.userGrowthRate > 0 ? (
                    <span className="flex items-center text-green-500">
                      <ArrowUpRight className="h-3 w-3" />
                      {Math.abs(stats.userGrowthRate).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="flex items-center text-red-500">
                      <ArrowDownRight className="h-3 w-3" />
                      {Math.abs(stats.userGrowthRate).toFixed(1)}%
                    </span>
                  )}
                </div>
              </CardContent>
              <div className="bg-muted/50 h-2">
                <div className="bg-primary h-full" style={{ width: `${Math.min(stats.totalUsers / 100 * 10, 100)}%` }}></div>
              </div>
            </Card>
            
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Businesses
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalBusinesses}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{stats.newBusinessesLast30Days} new in last 30 days</span>
                  {stats.businessGrowthRate > 0 ? (
                    <span className="flex items-center text-green-500">
                      <ArrowUpRight className="h-3 w-3" />
                      {Math.abs(stats.businessGrowthRate).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="flex items-center text-red-500">
                      <ArrowDownRight className="h-3 w-3" />
                      {Math.abs(stats.businessGrowthRate).toFixed(1)}%
                    </span>
                  )}
                </div>
              </CardContent>
              <div className="bg-muted/50 h-2">
                <div className="bg-primary h-full" style={{ width: `${Math.min(stats.totalBusinesses / 50 * 10, 100)}%` }}></div>
              </div>
            </Card>
            
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Compliance Balance
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stats.totalComplianceBalance.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total across all businesses
                </p>
              </CardContent>
              <div className="bg-muted/50 h-2">
                <div className="bg-primary h-full" style={{ width: `${Math.min(stats.totalComplianceBalance / 1000 * 100, 100)}%` }}></div>
              </div>
            </Card>
            
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Chat Balance
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stats.totalChatBalance.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total across all businesses
                </p>
              </CardContent>
              <div className="bg-muted/50 h-2">
                <div className="bg-primary h-full" style={{ width: `${Math.min(stats.totalChatBalance / 1000 * 100, 100)}%` }}></div>
              </div>
            </Card>
          </div>

          {/* Business Status Distribution */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Card className="col-span-full lg:col-span-2">
              <CardHeader>
                <CardTitle>Business Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex flex-wrap gap-4">
                  <div className="flex flex-col items-center bg-muted/50 rounded-lg p-4 min-w-[140px]">
                    <Badge variant="outline" className="mb-2 bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700">
                      Active
                    </Badge>
                    <div className="text-2xl font-bold">{stats.statusCounts["ACTIVE"] || 0}</div>
                    <div className="text-xs text-muted-foreground">businesses</div>
                  </div>
                  <div className="flex flex-col items-center bg-muted/50 rounded-lg p-4 min-w-[140px]">
                    <Badge variant="outline" className="mb-2 bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 hover:text-yellow-700">
                      Invited
                    </Badge>
                    <div className="text-2xl font-bold">{stats.statusCounts["INVITED"] || 0}</div>
                    <div className="text-xs text-muted-foreground">businesses</div>
                  </div>
                  <div className="flex flex-col items-center bg-muted/50 rounded-lg p-4 min-w-[140px]">
                    <Badge variant="outline" className="mb-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-700">
                      Inactive
                    </Badge>
                    <div className="text-2xl font-bold">{stats.statusCounts["INACTIVE"] || 0}</div>
                    <div className="text-xs text-muted-foreground">businesses</div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/businesses">View all businesses</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* User Roles Distribution */}
            <Card className="col-span-full lg:col-span-2">
              <CardHeader>
                <CardTitle>User Roles Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex flex-wrap gap-4">
                  <div className="flex flex-col items-center bg-muted/50 rounded-lg p-4 min-w-[140px]">
                    <Badge variant="outline" className="mb-2 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 hover:text-blue-700">
                      Admin
                    </Badge>
                    <div className="text-2xl font-bold">{stats.roleCounts["ADMIN"] || 0}</div>
                    <div className="text-xs text-muted-foreground">users</div>
                  </div>
                  <div className="flex flex-col items-center bg-muted/50 rounded-lg p-4 min-w-[140px]">
                    <Badge variant="outline" className="mb-2 bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 hover:text-purple-700">
                      Owner
                    </Badge>
                    <div className="text-2xl font-bold">{stats.roleCounts["OWNER"] || 0}</div>
                    <div className="text-xs text-muted-foreground">users</div>
                  </div>
                  <div className="flex flex-col items-center bg-muted/50 rounded-lg p-4 min-w-[140px]">
                    <Badge variant="outline" className="mb-2 bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700">
                      User
                    </Badge>
                    <div className="text-2xl font-bold">{stats.roleCounts["USER"] || 0}</div>
                    <div className="text-xs text-muted-foreground">users</div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/users">View all users</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          {/* Recent Activity Section */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Users */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
                <CardDescription>
                  Recently registered users on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <UserIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        {user.business && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {user.business.name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(user.createdAt.toString())}
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 flex justify-end">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/admin/users" className="text-sm text-primary">
                        View all users
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Businesses */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Recent Businesses</CardTitle>
                <CardDescription>
                  Recently registered businesses on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentBusinesses.map((business) => (
                    <div key={business.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{business.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">{business.businessType}</p>
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {business._count.employees}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(business.createdAt.toString())}
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 flex justify-end">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/admin/businesses" className="text-sm text-primary">
                        View all businesses
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Analytics</CardTitle>
              <CardDescription>
                User and business growth analytics over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-8">
                <div className="h-40 w-full flex items-end justify-between gap-2">
                  {/* Simulated bar chart - In a real app, use a proper charting library */}
                  <div className="flex-1 bg-primary/20 rounded-t-md" style={{ height: '30%' }}></div>
                  <div className="flex-1 bg-primary/30 rounded-t-md" style={{ height: '45%' }}></div>
                  <div className="flex-1 bg-primary/40 rounded-t-md" style={{ height: '60%' }}></div>
                  <div className="flex-1 bg-primary/50 rounded-t-md" style={{ height: '40%' }}></div>
                  <div className="flex-1 bg-primary/60 rounded-t-md" style={{ height: '70%' }}></div>
                  <div className="flex-1 bg-primary/70 rounded-t-md" style={{ height: '65%' }}></div>
                  <div className="flex-1 bg-primary/80 rounded-t-md" style={{ height: '90%' }}></div>
                  <div className="flex-1 bg-primary/90 rounded-t-md" style={{ height: '75%' }}></div>
                  <div className="flex-1 bg-primary rounded-t-md" style={{ height: '100%' }}></div>
                </div>
                <div className="text-xs text-muted-foreground mt-4">
                  Growth trend over the past 9 months
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between border-t px-6 py-4">
              <div className="text-xs text-muted-foreground">
                Last updated: {formatDate(new Date().toString())}
              </div>
              <Button variant="outline" size="sm">
                Generate Report
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
