import { Metadata } from "next";
import { ProjectCreateForm } from "@/components/dashboard/projects/project-create-form";

export const metadata: Metadata = {
  title: "Create Project",
  description: "Create a new project and assign team members",
};

export default function CreateProjectPage() {
  return (
    <div className="container py-6">
      <ProjectCreateForm />
    </div>
  );
}
