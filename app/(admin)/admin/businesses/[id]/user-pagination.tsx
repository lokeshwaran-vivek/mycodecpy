"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface UserPaginationProps {
  currentPage: number;
  totalPages: number;
}

export default function UserPagination({
  currentPage,
  totalPages,
}: UserPaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const handlePageChange = (pageNumber: number) => {
    router.push(createPageURL(pageNumber));
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Previous page"
      >
        Previous
      </Button>

      <span className="text-sm">
        Page {currentPage} of {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
      >
        Next
      </Button>
    </div>
  );
} 