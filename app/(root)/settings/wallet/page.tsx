import { Metadata } from "next";
export const dynamic = 'force-dynamic';
import { getWalletBalance } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import TransactionsTable from "./components/TransactionsTable";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Clock, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Wallet",
  description: "Manage your wallet and view transaction history",
};

export default async function WalletPage() {
  const { data: wallet } = await getWalletBalance();

  if (!wallet) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Error fetching wallet balance</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight">Wallet Overview</h3>
        <p className="text-sm text-muted-foreground">Monitor your balances and recent transactions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="relative overflow-hidden">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Compliance Balance
            </CardTitle>
            <CardDescription>Available balance for compliance operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2">
              <span className="text-4xl font-bold tracking-tight">
                {Number(wallet.complianceBalance).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Chat Balance
            </CardTitle>
            <CardDescription>Available balance for chat services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2">
              <span className="text-4xl font-bold tracking-tight">
                {Number(wallet.chatBalance).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xl font-semibold tracking-tight">Transaction History</h4>
            <p className="text-sm text-muted-foreground">View and filter your transactions</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Suspense 
              fallback={
                <div className="divide-y divide-border">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-3 w-[150px]" />
                          </div>
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-4 w-[100px]" />
                          <Skeleton className="h-3 w-[80px] mt-2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              }
            >
              <TransactionsTable />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
