"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, UserMinus, Loader2, Crown } from "lucide-react";
import { useState } from "react";
import { TeamManageDialog } from "./team-manage-dialog";
import { ProjectWithTemplates } from "@/lib/types";
import { toast } from "sonner";
import { removeProjectTeamMember } from "../actions";

interface TeamTabProps {
  project: ProjectWithTemplates;
  onUpdate?: () => void;
}

export function TeamTab({ project, onUpdate }: TeamTabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;

    setMemberToRemove(memberId);
    try {
      const response = await removeProjectTeamMember(project.id, memberId);

      if (response.status) {
        toast.success(response.message || "Team member removed successfully");
        if (onUpdate) onUpdate();
      } else {
        toast.error(response.message || "Failed to remove team member");
      }
    } catch (error) {
      console.error("Error removing team member:", error);
      toast.error("An error occurred while removing the team member");
    } finally {
      setMemberToRemove(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Project team and their roles</CardDescription>
            </div>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Members
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.team?.map((member) => {
            const isProjectOwner = member.id === project.createdById;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{member.name}</p>
                    {isProjectOwner && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Crown className="h-3 w-3 text-yellow-500" />
                        <span>Owner</span>
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{member.role}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {member.email}
                    </span>
                  </div>
                </div>
                {!isProjectOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={memberToRemove === member.id}
                  >
                    {memberToRemove === member.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="h-4 w-4 text-red-500" />
                    )}
                  </Button>
                )}
              </div>
            );
          })}
          {(!project.team || project.team.length === 0) && (
            <div className="text-center text-sm text-muted-foreground py-4">
              No team members yet. Add members to get started.
            </div>
          )}
        </CardContent>
      </Card>

      <TeamManageDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        projectId={project.id}
        existingTeamIds={project.team?.map((member) => member.id) || []}
        onSuccess={onUpdate}
      />
    </>
  );
}
