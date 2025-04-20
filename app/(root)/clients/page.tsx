import { ClientsList } from "@/components/dashboard/clients/clients-list";
import { getClients } from "@/app/(root)/clients/actions";

const ITEMS_PER_PAGE = 10;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { search = "", page = 1, tab = "all" } = await searchParams;

  const { data: clientsData } = await getClients(
    search as string,
    parseInt(page as string),
    ITEMS_PER_PAGE,
    tab !== "all" ? (tab as string) : undefined,
  );

  return (
    <div className="flex-1 space-y-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
      </div>
      <ClientsList
        clientsData={clientsData?.clients || []}
        currentPage={clientsData?.currentPage || 1}
        totalPages={clientsData?.totalPages || 1}
      />
    </div>
  );
}
