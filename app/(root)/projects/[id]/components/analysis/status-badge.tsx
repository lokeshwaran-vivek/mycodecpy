import { Badge } from "@/components/ui/badge";
import { AnalysisStatus } from "@prisma/client";

interface StatusBadgeProps {
  status: AnalysisStatus;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  switch (status) {
    case "COMPLETED":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
          Completed
        </Badge>
      );
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>;
    case "IN_PROGRESS":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
          In Progress
        </Badge>
      );
    case "QUEUED":
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
          Queued
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
