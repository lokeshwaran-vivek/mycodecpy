import { Metadata } from "next";
import { ProjectsList } from "@/components/dashboard/projects/projects-list";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ITEMS_PER_PAGE } from "@/app/api/utils";
import { getProjects } from "./actions";

export const metadata: Metadata = {
  title: "Projects",
  description: "Manage your projects and track their progress",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { search = "", page = 1 } = await searchParams;

  const { data: projectsData } = await getProjects(
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
        <ProjectsList
          projectsData={projectsData?.projects || []}
          currentPage={projectsData?.currentPage || 1}
          totalPages={projectsData?.totalPages || 1}
        />
      </Suspense>
    </div>
  );
}
