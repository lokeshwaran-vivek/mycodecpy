import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GLEntry } from "../types";
import { formatValue, paginateData } from "../utils";
import { PaginationControls } from "../pagination";

interface ResultsTabProps {
  results: GLEntry[] | null;
  isDetailOpen: boolean;
  setIsDetailOpen: (open: boolean) => void;
  selectedItem: GLEntry | null;
  setSelectedItem: (item: GLEntry | null) => void;
}

export const ResultsTab = ({
  results,
  isDetailOpen,
  setIsDetailOpen,
  selectedItem,
  setSelectedItem,
}: ResultsTabProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);

  if (!results || !results.length) {
    return null;
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {Object.keys(results[0]).map((key) => (
                <TableHead key={key} className="text-sm">
                  {key.split(/(?=[A-Z])/).join(" ")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginateData(results, currentPage, pageSize).map((item, index) => (
              <TableRow
                className="cursor-pointer"
                key={item.id || index}
                onClick={() => {
                  setSelectedItem(item);
                  setIsDetailOpen(true);
                }}
              >
                {Object.entries(item).map(([key, value], valueIndex) => (
                  <TableCell key={`${key}-${valueIndex}`} className="text-sm">
                    {typeof value === "object" && value !== null ? (
                      <div className="space-y-1">
                        {Object.entries(value).map(([subKey, subValue]) => (
                          <Badge
                            key={subKey}
                            variant="outline"
                            className="mr-1"
                          >
                            {`${subKey}: ${formatValue(subValue)}`}
                          </Badge>
                        ))}
                      </div>
                    ) : typeof value === "number" ? (
                      value.toLocaleString()
                    ) : (
                      formatValue(value)
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PaginationControls
        totalItems={results.length}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entry Details</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(selectedItem).map(([key, value]) => (
                <div key={key}>
                  <div className="text-sm font-medium text-gray-500">
                    {key.split(/(?=[A-Z])/).join(" ")}
                  </div>
                  <div className="text-sm">
                    {typeof value === "object" && value !== null
                      ? JSON.stringify(value, null, 2)
                      : formatValue(value)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
