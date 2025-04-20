import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MessageSquare } from "lucide-react";
import { Project } from "@prisma/client";
import { useState } from "react";

interface ProjectHeaderProps {
  project: Project;
  onRunAnalysis: () => void;
}

export function ProjectHeader({ project, onRunAnalysis }: ProjectHeaderProps) {
  const router = useRouter();

  const [isLoading] = useState(false);

  // const getStatusBadgeVariant = (status: Project["status"]) => {
  //   switch (status) {
  //     case "COMPLETED":
  //       return "default" as const;
  //     case "IN_PROGRESS":
  //       return "secondary" as const;
  //     case "ON_HOLD":
  //       return "outline" as const;
  //     case "CANCELLED":
  //       return "destructive" as const;
  //   }
  // };

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {/* <Badge variant={getStatusBadgeVariant(project.status)}>
            {project.status.replace("_", " ")}
          </Badge> */}
        </div>
        <h2 className="text-3xl font-bold tracking-tight">{project.code}</h2>
        <p className="text-sm text-muted-foreground">
          {project.description ? project.description : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/projects/${project.id}/chat`)}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Chat
        </Button>
        <Button
          onClick={onRunAnalysis}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Run Analysis
        </Button>
      </div>
    </div>
  );
}
