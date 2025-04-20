import { getBusinesses, toggleBusinessStatus } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Status } from "@prisma/client";
import { SearchParams } from "@/types/search-params";
import { PaginationButtons } from "@/components/admin/pagination-buttons";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Search, Users, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page = 1, search = "", status = "all" } = await searchParams;
  const limit = 10;

  const { businesses, total, pages } = await getBusinesses({
    page: Number(page),
    limit,
    search,
    status: status === "all" ? undefined : (status as Status),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Businesses</h1>
          <p className="text-muted-foreground">
            Manage businesses and their settings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Businesses
            </CardTitle>
            <CardDescription>All registered businesses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Businesses
            </CardTitle>
            <CardDescription>Currently operational</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {businesses.filter((b) => b.status === Status.ACTIVE).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Inactive Businesses
            </CardTitle>
            <CardDescription>Temporarily suspended</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {businesses.filter((b) => b.status === Status.INACTIVE).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <form className="flex w-full items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              name="search"
              placeholder="Search businesses..."
              defaultValue={search}
              className="pl-8 pr-10"
            />
            {search && (
              <Link
                href="/admin/businesses"
                className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Link>
            )}
          </div>
          <div className="w-full max-w-[180px]">
            <Select name="status" defaultValue={status}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="sm">
            Filter
          </Button>
        </form>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business Name</TableHead>
              <TableHead>Registration Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Users</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {businesses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="rounded-full bg-muted p-3">
                      <Building2 className="h-10 w-10 text-muted-foreground/70" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">
                      No businesses found
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-xs text-center">
                      {search || status !== "all"
                        ? "Try adjusting your search filters or create a new business"
                        : "Get started by adding your first business"}
                    </p>
                    <Button asChild className="mt-4">
                      <Link href="/admin/businesses/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Business
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              businesses.map((business) => (
                <TableRow key={business.id} className="group">
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/businesses/${business.id}`}
                      className="text-blue-600 hover:underline hover:text-blue-800 transition-colors"
                    >
                      {business.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {formatDate(business.createdAt.toString())}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        business.status === Status.ACTIVE
                          ? "success"
                          : "destructive"
                      }
                      className="capitalize"
                    >
                      {business.status.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {business.website ? (
                      <a
                        href={business.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline group-hover:text-blue-800 transition-colors"
                      >
                        {business.website}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{business.employees.length}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/businesses/${business.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      <form
                        action={async () => {
                          "use server";
                          await toggleBusinessStatus(business.id);
                        }}
                      >
                        <Button
                          type="submit"
                          variant={
                            business.status === Status.ACTIVE
                              ? "destructive"
                              : "default"
                          }
                          size="sm"
                        >
                          {business.status === Status.ACTIVE
                            ? "Deactivate"
                            : "Activate"}
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing <strong>{businesses.length}</strong> of{" "}
          <strong>{total}</strong> businesses
        </div>
        {total > 0 && (
          <PaginationButtons currentPage={Number(page)} totalPages={pages} />
        )}
      </div>
    </div>
  );
}
