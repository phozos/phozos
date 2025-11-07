import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Gift, TrendingUp, X, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface MigrationOffer {
  migration: {
    id: string;
    name: string;
    migrationType: 'voluntary' | 'mandatory' | 'incentivized';
    incentiveType?: 'discount' | 'free_months' | 'feature_upgrade';
    incentiveValue?: any;
    endDate?: string;
  };
  currentPlan: {
    id: string;
    name: string;
    price: number;
  };
  targetPlan: {
    id: string;
    name: string;
    price: number;
  };
  userMigration: {
    id: string;
    status: string;
  };
}

export default function MigrationOffer() {
  const { toast } = useToast();
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineForm, setShowDeclineForm] = useState(false);

  const { data: offer, isLoading, refetch } = useApiQuery<MigrationOffer>(
    ['migration-offer'],
    '/api/subscription/migration-offer'
  );

  const acceptMutation = useApiMutation(
    async (migrationId: string) => api.post(`/api/subscription/migrations/${migrationId}/accept`),
    {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Migration accepted! Your plan will be updated shortly.",
        });
        refetch();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to accept migration",
          variant: "destructive",
        });
      }
    }
  );

  const declineMutation = useApiMutation(
    async ({ migrationId, reason }: { migrationId: string; reason?: string }) => 
      api.post(`/api/subscription/migrations/${migrationId}/decline`, { reason }),
    {
      onSuccess: () => {
        toast({
          title: "Migration Declined",
          description: "Thank you for your feedback.",
        });
        refetch();
        setShowDeclineForm(false);
        setDeclineReason('');
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to decline migration",
          variant: "destructive",
        });
      }
    }
  );

  const handleAccept = () => {
    if (offer?.migration.id) {
      acceptMutation.mutate(offer.migration.id);
    }
  };

  const handleDecline = () => {
    if (offer?.migration.id) {
      declineMutation.mutate({ migrationId: offer.migration.id, reason: declineReason });
    }
  };

  const getIncentiveDescription = () => {
    if (!offer?.migration.incentiveType) return null;

    const { incentiveType, incentiveValue } = offer.migration;

    switch (incentiveType) {
      case 'discount':
        return `${incentiveValue?.percentage || 0}% discount for ${incentiveValue?.duration || 3} months`;
      case 'free_months':
        return `${incentiveValue?.months || 1} month${incentiveValue?.months > 1 ? 's' : ''} free`;
      case 'feature_upgrade':
        return 'Premium features included';
      default:
        return 'Special offer included';
    }
  };

  if (isLoading) {
    return null;
  }

  if (!offer || offer.userMigration.status !== 'pending') {
    return null;
  }

  const isMandatory = offer.migration.migrationType === 'mandatory';
  const isIncentivized = offer.migration.migrationType === 'incentivized';

  return (
    <Card className="border-2 border-blue-500 shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {isIncentivized && <Gift className="w-5 h-5 text-yellow-500" />}
              Plan Migration Available
              {isMandatory && (
                <Badge variant="destructive">Action Required</Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-2">
              {offer.migration.name}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Current Plan</p>
            <p className="text-lg font-semibold">{offer.currentPlan.name}</p>
            <p className="text-sm">₹{offer.currentPlan.price}/month</p>
          </div>

          <ArrowRight className="w-6 h-6 text-muted-foreground" />

          <div>
            <p className="text-sm text-muted-foreground">New Plan</p>
            <p className="text-lg font-semibold text-blue-600">{offer.targetPlan.name}</p>
            <p className="text-sm">₹{offer.targetPlan.price}/month</p>
          </div>
        </div>

        {isIncentivized && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <Gift className="w-4 h-4 text-yellow-600" />
            <AlertDescription className="ml-2">
              <span className="font-semibold">Special Offer: </span>
              {getIncentiveDescription()}
            </AlertDescription>
          </Alert>
        )}

        {offer.migration.endDate && (
          <p className="text-sm text-muted-foreground">
            This offer expires on {format(new Date(offer.migration.endDate), 'MMMM dd, yyyy')}
          </p>
        )}

        {isMandatory && (
          <Alert>
            <AlertDescription>
              This is a mandatory migration. Your plan will be automatically updated if no action is taken.
            </AlertDescription>
          </Alert>
        )}

        {showDeclineForm && !isMandatory && (
          <div className="space-y-2">
            <Label htmlFor="decline-reason">Why are you declining? (Optional)</Label>
            <Textarea
              id="decline-reason"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Help us understand your decision..."
              rows={3}
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {showDeclineForm && !isMandatory ? (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeclineForm(false);
                setDeclineReason('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={declineMutation.isPending}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Confirm Decline
            </Button>
          </>
        ) : (
          <>
            {!isMandatory && (
              <Button
                variant="outline"
                onClick={() => setShowDeclineForm(true)}
                disabled={acceptMutation.isPending || declineMutation.isPending}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Decline
              </Button>
            )}
            <Button
              onClick={handleAccept}
              disabled={acceptMutation.isPending || declineMutation.isPending}
              className="flex-1"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Accept Migration
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
