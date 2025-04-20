import { CasList } from "@/components/dashboard/cas/cas-list";
import { getUsers } from "./actions";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Metadata } from "next";

const ITEMS_PER_PAGE = 10;

export const metadata: Metadata = {
  title: "Chartered Accountants",
  description: "Manage your chartered accountants and team members",
};

export default async function CAsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { search = "", page = 1 } = await searchParams;

  const { data: usersData } = await getUsers(
    search as string,
    parseInt(page as string),
    ITEMS_PER_PAGE
  );

  return (
    <div className="flex-1 space-y-4 pt-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <CasList
          usersData={usersData?.users || []}
          currentPage={usersData?.currentPage || 1}
          totalPages={usersData?.totalPages || 1}
        />
      </Suspense>
    </div>
  );
}
