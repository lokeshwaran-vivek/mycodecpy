import { ChatInterface } from "@/components/dashboard/chat/chat-interface";
import { getProject } from "../actions";
import { ProjectWithTemplates } from "@/lib/types";

export default async function ProjectChatPage({
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
  return <ChatInterface project={project} />;
}
