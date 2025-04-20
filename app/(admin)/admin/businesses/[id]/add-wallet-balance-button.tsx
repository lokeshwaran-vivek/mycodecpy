"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addWalletBalance } from "../../../actions";
import { useRouter } from "next/navigation";

interface AddWalletBalanceButtonProps {
  businessId: string;
}

export default function AddWalletBalanceButton({
  businessId,
}: AddWalletBalanceButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [walletType, setWalletType] = useState<
    "complianceBalance" | "chatBalance"
  >("complianceBalance");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addWalletBalance({
        businessId,
        amount: parseFloat(amount),
        type: walletType,
      });

      // Reset form and close dialog
      setAmount("");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to add wallet balance:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Wallet Balance</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Wallet Balance</DialogTitle>
            <DialogDescription>
              Add funds to this business&apos;s wallet. The changes will be saved
              immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="col-span-3"
                placeholder="0.00"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="walletType" className="text-right">
                Wallet Type
              </Label>
              <Select
                value={walletType}
                onValueChange={(value) =>
                  setWalletType(
                    value as "complianceBalance" | "chatBalance"
                  )
                }
              >
                <SelectTrigger className="col-span-3" id="walletType">
                  <SelectValue placeholder="Select wallet type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complianceBalance">
                    Compliance Wallet
                  </SelectItem>
                  <SelectItem value="chatBalance">Chat Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Balance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 