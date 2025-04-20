import { Metadata } from "next";
import { AuditLogsClient } from "@/components/dashboard/audit-logs/audit-logs-client";

export const metadata: Metadata = {
  title: "Audit Logs",
  description: "View all system audit logs",
};

export default async function AuditLogsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
      </div>
      <div className="space-y-4">
        <AuditLogsClient />
      </div>
    </div>
  );
}
