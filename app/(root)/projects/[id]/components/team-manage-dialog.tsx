"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, UserPlus, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAvailableTeamMembers, addProjectTeamMembers } from "../actions";
import { toast } from "@/hooks/use-toast";

// Type for available team members
interface AvailableMember {
  id: string;
  name: string;
  role: string;
  email: string;
}

interface TeamManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  existingTeamIds: string[];
  onSuccess?: () => void;
}

export function TeamManageDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: TeamManageDialogProps) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const fetchAvailableMembers = useCallback(async () => {
    if (!projectId) return;

    setIsFetching(true);
    try {
      const response = await getAvailableTeamMembers(
        projectId,
        searchQuery,
        roleFilter
      );

      if (response.status) {
        setAvailableMembers(response.data);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to fetch team members",
        });
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast({
        title: "Error",
        description: "An error occurred while fetching team members",
      });
    } finally {
      setIsFetching(false);
    }
  }, [projectId, searchQuery, roleFilter, setIsFetching, setAvailableMembers]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedMembers([]);
      setSearchQuery("");
      setRoleFilter("all");
    } else {
      fetchAvailableMembers();
    }
  }, [open, projectId, fetchAvailableMembers]);

  // Fetch available members when search query or role filter changes
  useEffect(() => {
    if (open) {
      const delayDebounceFn = setTimeout(() => {
        fetchAvailableMembers();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchQuery, roleFilter, open, fetchAvailableMembers]);

  // Group members by role
  const groupedMembers = availableMembers.reduce(
    (groups, member) => {
      const role = member.role;
      if (!groups[role]) {
        groups[role] = [];
      }
      groups[role].push(member);
      return groups;
    },
    {} as Record<string, AvailableMember[]>
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMembers(availableMembers.map((member) => member.id));
    } else {
      setSelectedMembers([]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMembers.length) return;

    setIsLoading(true);
    try {
      const members = availableMembers
        .filter((member) => selectedMembers.includes(member.id))
        .map((member) => {
          return {
            email: member.email,
            id: member.id,
          };
        });

      const response = await addProjectTeamMembers(projectId, members);

      if (response.status) {
        toast({
          title: "Success",
          description: response.message || "Team members added successfully",
        });
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to add team members",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An error occurred while adding team members",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isAllSelected =
    availableMembers.length > 0 &&
    availableMembers.every((member) => selectedMembers.includes(member.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Team Members
          </DialogTitle>
          <DialogDescription>
            Select team members to add to the project. You can filter by role
            and search by name or email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filter Controls */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="CA">Chartered Accountant</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="OWNER">Owner</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selection Summary */}
          <div className="flex items-center justify-between py-2 px-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {selectedMembers.length} member
                {selectedMembers.length !== 1 && "s"} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Select All</span>
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                disabled={availableMembers.length === 0}
              />
            </div>
          </div>

          {/* Members List */}
          <ScrollArea className="h-[300px] rounded-md border">
            {isFetching ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2">Loading members...</span>
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {Object.entries(groupedMembers).length > 0 ? (
                  Object.entries(groupedMembers).map(([role, members]) => (
                    <div key={role} className="space-y-2">
                      <div className="sticky top-0 bg-background/95 backdrop-blur z-10 py-1">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Badge variant="secondary">{role}</Badge>
                          <span className="text-muted-foreground">
                            {members.length} available
                          </span>
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted"
                          >
                            <Checkbox
                              id={member.id}
                              checked={selectedMembers.includes(member.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedMembers([
                                    ...selectedMembers,
                                    member.id,
                                  ]);
                                } else {
                                  setSelectedMembers(
                                    selectedMembers.filter(
                                      (id) => id !== member.id
                                    )
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={member.id}
                              className="flex-1 flex items-center justify-between cursor-pointer"
                            >
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {member.email}
                                </p>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    {searchQuery || roleFilter !== "all"
                      ? "No members found matching your filters."
                      : "No more members available to add."}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || selectedMembers.length === 0}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add {selectedMembers.length} Member
            {selectedMembers.length !== 1 && "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
