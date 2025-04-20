import { ProjectDetail } from "@/components/dashboard/projects/project-detail";
import { getProject } from "./actions";
import { ProjectWithTemplates } from "@/lib/types";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const fetchProject = async () => {
    const result = await getProject(id);
    if (!result?.projectData) {
      return null;
    }
    return result;
  };

  const result = await fetchProject();

  if (!result?.projectData) {
    return null;
  }

  const project: ProjectWithTemplates = {
    ...result.projectData,
    templates: result.projectTemplatesData || [],
    team: result.projectMembersData || [],
    members: result.projectMembersData || [],
  };

  return (
    <div className="flex flex-col space-y-6">
      <ProjectDetail project={project} />
    </div>
  );
}
