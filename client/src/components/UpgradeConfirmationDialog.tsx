import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

interface UpgradeConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  upgradeData: {
    currentPlanName: string;
    targetPlanName: string;
    originalPrice: number;
    alreadyPaid: number;
    prorationAmount: number;
    currency: string;
  } | null;
  isProcessing?: boolean;
}

export function UpgradeConfirmationDialog({ 
  open, 
  onOpenChange, 
  onConfirm,
  upgradeData,
  isProcessing = false
}: UpgradeConfirmationDialogProps) {
  if (!upgradeData) return null;

  const { currentPlanName, targetPlanName, originalPrice, alreadyPaid, prorationAmount, currency } = upgradeData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="w-6 h-6 text-primary" />
            Confirm Your Upgrade
          </DialogTitle>
          <DialogDescription>
            Review your upgrade details before proceeding to payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Transition */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Current Plan</span>
              <span className="font-semibold text-foreground">{currentPlanName}</span>
            </div>
            <ArrowRight className="w-5 h-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Upgrading To</span>
              <span className="font-semibold text-primary">{targetPlanName}</span>
            </div>
          </div>

          {/* Proration Breakdown */}
          <div className="space-y-3 p-4 border border-border rounded-lg bg-background">
            <h4 className="font-semibold text-sm text-foreground mb-3">Payment Breakdown</h4>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{targetPlanName} Plan Price</span>
                <span className="font-medium">{formatCurrency(originalPrice, currency)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Already Paid</span>
                <span className="font-medium text-green-600">- {formatCurrency(alreadyPaid, currency)}</span>
              </div>
              
              <div className="h-px bg-border my-2" />
              
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">Upgrade Cost</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(prorationAmount, currency)}</span>
              </div>
            </div>

            {/* Savings Badge */}
            {alreadyPaid > 0 && (
              <div className="pt-3 border-t border-border">
                <Badge variant="secondary" className="w-full justify-center py-2 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  You've already paid {formatCurrency(alreadyPaid, currency)} - Upgrade for just {formatCurrency(prorationAmount, currency)} more!
                </Badge>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded border border-border">
            <p className="mb-1">✓ Instant access to all {targetPlanName} features</p>
            <p className="mb-1">✓ Lifetime access - pay once, use forever</p>
            <p>✓ Secure payment powered by Razorpay</p>
          </div>
        </div>

        <DialogFooter className="sm:space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90"
          >
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <IndianRupee className="w-4 h-4 mr-2" />
                Proceed to Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
