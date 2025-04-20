"use client";

import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "../actions";
import { useState } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 10;

type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "ALL";

export default function TransactionsTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedType, setSelectedType] = useState<TransactionType>("ALL");

  const { data } = useQuery({
    queryKey: ["transactions", currentPage, selectedType],
    queryFn: async () => {
      try {
        const response = await getTransactions(ITEMS_PER_PAGE, currentPage);
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      } catch (error) {
        console.error("Error fetching transactions:", error);
        toast({
          title: "Error",
          description: "Failed to fetch transactions. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
  });

  const transactions = data?.transactions || [];
  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE);

  const filteredTransactions =
    selectedType === "ALL"
      ? transactions
      : transactions.filter((t) => t.type === selectedType);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {selectedType === "ALL"
                  ? "All Transactions"
                  : selectedType.charAt(0) +
                    selectedType.slice(1).toLowerCase()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedType("ALL")}>
                All Transactions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedType("DEPOSIT")}>
                Deposits
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedType("WITHDRAWAL")}>
                Withdrawals
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className="group hover:bg-muted/50 cursor-pointer"
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className={`rounded-full p-2 ${
                        transaction.type === "DEPOSIT"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {transaction.type === "DEPOSIT" ? (
                        <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUp className="h-4 w-4" />
                      )}
                    </div>
                    <span className="font-medium">
                      {transaction.type === "DEPOSIT"
                        ? "Deposit"
                        : "Withdrawal"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(transaction.createdAt), "PPp")}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div
                    className={`text-sm font-medium ${
                      transaction.type === "DEPOSIT"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {transaction.type === "DEPOSIT" ? "+" : "-"}
                    {Math.abs(transaction.amount).toLocaleString()}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      transaction.type === "DEPOSIT" ? "outline" : "secondary"
                    }
                    className="group-hover:bg-background"
                  >
                    {transaction.type}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filteredTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <div className="text-muted-foreground">
                    No transactions found
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center py-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage((p) => Math.max(1, p - 1));
                  }}
                  className={
                    currentPage === 1 ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
              {[...Array(totalPages)].map((_, i) => (
                <PaginationItem key={i + 1}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(i + 1);
                    }}
                    isActive={currentPage === i + 1}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                  }}
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
