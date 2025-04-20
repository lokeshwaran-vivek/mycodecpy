import { notFound } from "next/navigation";
import { getBusinessById } from "../../../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SearchParams } from "@/types/search-params";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AddWalletBalanceButton from "./add-wallet-balance-button";
import UserPagination from "./user-pagination";
import Link from "next/link";
import { 
  ArrowLeft, 
  Building2, 
  ChevronRight, 
  Edit, 
  Mail, 
  UserPlus,
  Users
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Simple breadcrumb component since we don't have the shadcn breadcrumb component
function Breadcrumb({ children }: { children: React.ReactNode }) {
  return <nav className="flex mb-4">{children}</nav>;
}

function BreadcrumbList({ children }: { children: React.ReactNode }) {
  return <ol className="flex items-center space-x-1">{children}</ol>;
}

function BreadcrumbItem({ children }: { children: React.ReactNode }) {
  return <li className="flex items-center">{children}</li>;
}

function BreadcrumbLink({ children, href }: { children: React.ReactNode, href?: string }) {
  if (href) {
    return <Link href={href} className="text-sm font-medium text-muted-foreground hover:text-foreground">{children}</Link>;
  }
  return <span className="text-sm font-medium">{children}</span>;
}

function BreadcrumbSeparator({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

export default async function BusinessDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const business = await getBusinessById(id);

  if (!business) {
    notFound();
  }

  // Get the wallet balance - may be null if no wallet exists
  const wallet = business.Wallet[0] || {
    complianceBalance: 0,
    chatBalance: 0,
  };

  const userSearch = (await searchParams).userSearch || "";
  const activeTab = (await searchParams).tab || "overview";
  const page = Number((await searchParams).page) || 1;
  const limit = 10;

  // Filter users based on search
  const filteredUsers = userSearch
    ? business.employees.filter(
        (user) =>
          user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
          user.email.toLowerCase().includes(userSearch.toLowerCase())
      )
    : business.employees;

  // Apply pagination
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedUsers = filteredUsers.slice(start, end);
  const totalPages = Math.ceil(filteredUsers.length / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/businesses">Businesses</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink>{business.name}</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Link 
              href="/admin/businesses"
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border bg-background text-muted-foreground shadow-sm hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold leading-tight">{business.name}</h1>
              <p className="text-sm text-muted-foreground">
                Business ID: {business.id.split('-')[0]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Badge
              variant={business.status === "ACTIVE" ? "success" : "destructive"}
              className="px-3 py-1 text-xs"
            >
              {business.status}
            </Badge>
            <Button variant="outline" size="sm" className="ml-2">
              <Edit className="h-4 w-4 mr-1" />
              Edit Business
            </Button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <CardDescription>All associated users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{business.employees.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Compliance Wallet
            </CardTitle>
            <CardDescription>Available balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${wallet.complianceBalance.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Chat Wallet</CardTitle>
            <CardDescription>Available balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${wallet.chatBalance.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Registration Date
            </CardTitle>
            <CardDescription>Account created on</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatDate(business.createdAt.toString())}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-3 gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="wallet">Wallet & Billing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Business Type</p>
                    <p className="font-medium">{business.businessType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">GST Number</p>
                    <p className="font-medium">{business.gst}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CIN</p>
                  <p className="font-medium">{business.cin || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{business.address}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Website</p>
                  {business.website ? (
                    <a 
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {business.website}
                    </a>
                  ) : (
                    <p className="font-medium text-muted-foreground">N/A</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground border rounded-md p-8 flex flex-col items-center justify-center">
                  <p>No recent activity to display</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Users ({filteredUsers.length})</h2>
            <div className="flex items-center gap-2">
              <form className="flex w-full max-w-sm items-center gap-2">
                <Input
                  type="text"
                  name="userSearch"
                  placeholder="Search users..."
                  defaultValue={userSearch}
                />
                <Button type="submit" size="sm">Search</Button>
              </form>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-1" />
                Invite User
              </Button>
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="h-10 w-10 text-muted-foreground/50" />
                        <h3 className="mt-2 text-lg font-semibold">
                          No users found
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {userSearch
                            ? "Try a different search term"
                            : "Add users to this business"}
                        </p>
                        <Button className="mt-4">
                          <UserPlus className="h-4 w-4 mr-1" />
                          Invite User
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.status === "ACTIVE" ? "success" : "destructive"
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(user.createdAt.toString())}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Mail className="h-4 w-4" />
                          <span className="sr-only">Email user</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {filteredUsers.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing <strong>{paginatedUsers.length}</strong> of{" "}
                <strong>{filteredUsers.length}</strong> users
              </div>
              
              <UserPagination 
                currentPage={page} 
                totalPages={totalPages} 
              />
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="wallet" className="space-y-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Wallet Management</h2>
            <AddWalletBalanceButton businessId={business.id} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Wallet</CardTitle>
                <CardDescription>Balance and transaction history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">
                  ${wallet.complianceBalance.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground border rounded-md p-8 flex flex-col items-center justify-center">
                  <p>No transaction history available</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Chat Wallet</CardTitle>
                <CardDescription>Balance and transaction history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">
                  ${wallet.chatBalance.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground border rounded-md p-8 flex flex-col items-center justify-center">
                  <p>No transaction history available</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 