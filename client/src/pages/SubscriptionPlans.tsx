import { useState, useMemo } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, DollarSign, Users, Crown, Eye, XCircle, TrendingUp, AlertTriangle, FileText, Clock, Mail, Bell, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { PremiumBadgeSelector, PremiumBadgeDisplay, BadgeKey, premiumBadges } from "@/components/PremiumBadges";
import { useAuth } from "@/hooks/useAuth";
import PlanVersionHistory from "@/components/admin/PlanVersionHistory";
import PriceUpdateDialog from "@/components/admin/PriceUpdateDialog";
import PlanDeprecationDialog from "@/components/admin/PlanDeprecationDialog";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  currency: string;
  description: string;
  logo: string;
  features: string[];
  maxUniversities: number;
  maxCountries: number;
  universityTier: string;
  supportType: string;
  turnaroundDays: number;
  includeLoanAssistance: boolean;
  includeVisaSupport: boolean;
  includeCounselorSession: boolean;
  includeScholarshipPlanning: boolean;
  includeMockInterview: boolean;
  includeExpertEditing: boolean;
  includePostAdmitSupport: boolean;
  includeDedicatedManager: boolean;
  includeNetworkingEvents: boolean;
  includeFlightAccommodation: boolean;
  isBusinessFocused: boolean;
  tierLevel: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserSubscription {
  subscription: {
    id: string;
    userId: string;
    planId: string;
    status: string;
    startedAt: string;
    expiresAt: string | null;
    orderId?: string;
    paymentReference?: string;
    paymentGateway?: string;
    amountPaid?: string;
    currency?: string;
    paidAt?: string;
    autoRenew: boolean;
    universitiesUsed: number;
    countriesUsed: number;
    createdAt: string;
    updatedAt: string;
    
    // Grandfathering fields
    subscribedPlanSnapshot?: any;
    grandfatheredPrice?: string;
    grandfatheredUntil?: string | null;
    isGrandfathered?: boolean;
  };
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  plan: {
    id: string;
    name: string;
    price: string;
    currency: string;
  };
}

interface PaymentHistory {
  subscriptionId: string;
  planId: string;
  planName: string;
  orderId: string | null;
  paymentReference: string | null;
  paymentGateway: string | null;
  amountPaid: string | null;
  currency: string | null;
  paidAt: string | null;
  status: string;
  startedAt: string;
  expiresAt: string | null;
}

interface SubscriptionEvent {
  id: string;
  subscriptionId: string;
  userId: string;
  eventType: string;
  oldStatus: string | null;
  newStatus: string | null;
  metadata: any;
  createdAt: string;
}

interface FailedPayment {
  id: string;
  userId: string;
  planId: string | null;
  orderId: string | null;
  paymentId: string | null;
  amount: string | null;
  currency: string | null;
  failureReason: string | null;
  razorpayErrorCode: string | null;
  razorpayErrorDescription: string | null;
  failedAt: string;
  notifiedAt: string | null;
  createdAt: string;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  planName: string | null;
  planPrice: string | null;
}

export default function SubscriptionPlans() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeKey>("platinum");
  const [editSelectedBadge, setEditSelectedBadge] = useState<BadgeKey>("platinum");
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "email" | "plan">("date");
  
  const [paymentHistoryDialog, setPaymentHistoryDialog] = useState<{ open: boolean; userId: string | null }>({ open: false, userId: null });
  const [eventsDialog, setEventsDialog] = useState<{ open: boolean; userId: string | null }>({ open: false, userId: null });
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; subscriptionId: string | null; userEmail: string | null }>({ open: false, subscriptionId: null, userEmail: null });
  const [upgradeDialog, setUpgradeDialog] = useState<{ open: boolean; subscription: UserSubscription | null }>({ open: false, subscription: null });
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<string>("");
  
  const [createVersionDialog, setCreateVersionDialog] = useState<{ open: boolean; plan: SubscriptionPlan | null; newPrice: string }>({ open: false, plan: null, newPrice: "" });
  const [notifySubscribers, setNotifySubscribers] = useState(true);
  
  const [selectedPlanForVersions, setSelectedPlanForVersions] = useState<string | null>(null);
  const [priceUpdateDialogOpen, setPriceUpdateDialogOpen] = useState(false);
  const [deprecationDialogOpen, setDeprecationDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  
  const isAdmin = user?.userType === 'team_member' && user?.teamRole === 'admin';

  const { data: plans = [], isLoading: plansLoading } = useApiQuery<SubscriptionPlan[]>(
    ["/api/admin/subscription-plans"],
    '/api/admin/subscription-plans',
    undefined,
    { enabled: !loading && isAdmin }
  );

  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useApiQuery<UserSubscription[]>(
    ["/api/admin/user-subscriptions"],
    '/api/admin/user-subscriptions',
    undefined,
    { enabled: !loading && isAdmin }
  );

  const { data: failedPayments = [], isLoading: failedPaymentsLoading } = useApiQuery<FailedPayment[]>(
    ["/api/admin/failed-payments"],
    '/api/admin/failed-payments',
    undefined,
    { enabled: !loading && isAdmin }
  );

  const { data: paymentHistory = [], isLoading: paymentHistoryLoading } = useApiQuery<PaymentHistory[]>(
    [`/api/admin/user-subscriptions/${paymentHistoryDialog.userId}/payment-history`],
    `/api/admin/user-subscriptions/${paymentHistoryDialog.userId}/payment-history`,
    undefined,
    { enabled: !loading && isAdmin && !!paymentHistoryDialog.userId }
  );

  const { data: subscriptionEvents = [], isLoading: eventsLoading } = useApiQuery<SubscriptionEvent[]>(
    [`/api/admin/user-subscriptions/${eventsDialog.userId}/events`],
    `/api/admin/user-subscriptions/${eventsDialog.userId}/events`,
    undefined,
    { enabled: !loading && isAdmin && !!eventsDialog.userId }
  );

  const createPlanMutation = useApiMutation(
    (data: Partial<SubscriptionPlan>) => 
      api.post("/api/admin/subscription-plans", data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
        setIsCreateDialogOpen(false);
        toast({ title: "Success", description: "Subscription plan created successfully" });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create subscription plan", variant: "destructive" });
      },
    }
  );

  const updatePlanMutation = useApiMutation(
    (data: { id: string; updates: Partial<SubscriptionPlan> }) =>
      api.put(`/api/admin/subscription-plans/${data.id}`, data.updates),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
        setEditingPlan(null);
        toast({ title: "Success", description: "Subscription plan updated successfully" });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to update subscription plan", variant: "destructive" });
      },
    }
  );

  const deletePlanMutation = useApiMutation(
    (id: string) => api.delete(`/api/admin/subscription-plans/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
        toast({ title: "Success", description: "Subscription plan deleted successfully" });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to delete subscription plan", variant: "destructive" });
      },
    }
  );

  const cancelSubscriptionMutation = useApiMutation(
    (subscriptionId: string) => api.delete(`/api/admin/user-subscriptions/${subscriptionId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/user-subscriptions"] });
        setCancelDialog({ open: false, subscriptionId: null, userEmail: null });
        toast({ title: "Success", description: "Subscription cancelled successfully" });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to cancel subscription", variant: "destructive" });
      },
    }
  );

  const createVersionMutation = useApiMutation(
    (data: { planId: string; updates: any; notifySubscribers: boolean }) =>
      api.post(`/api/admin/subscription-plans/${data.planId}/create-version`, {
        updates: data.updates,
        notifySubscribers: data.notifySubscribers
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/user-subscriptions"] });
        setCreateVersionDialog({ open: false, plan: null, newPrice: "" });
        toast({ 
          title: "Success", 
          description: "New plan version created successfully" + (notifySubscribers ? " and notifications sent" : "")
        });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create new plan version", variant: "destructive" });
      },
    }
  );

  const filteredAndSortedSubscriptions = useMemo(() => {
    let filtered = subscriptions.filter(sub => {
      const matchesStatus = statusFilter === "all" || sub.subscription.status === statusFilter;
      const matchesPlan = planFilter === "all" || sub.plan.id === planFilter;
      const matchesSearch = !searchText || 
        sub.user.email.toLowerCase().includes(searchText.toLowerCase()) ||
        (sub.user.firstName && sub.user.firstName.toLowerCase().includes(searchText.toLowerCase())) ||
        (sub.user.lastName && sub.user.lastName.toLowerCase().includes(searchText.toLowerCase()));
      
      return matchesStatus && matchesPlan && matchesSearch;
    });

    filtered.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.subscription.startedAt).getTime() - new Date(a.subscription.startedAt).getTime();
      } else if (sortBy === "email") {
        return a.user.email.localeCompare(b.user.email);
      } else {
        return a.plan.name.localeCompare(b.plan.name);
      }
    });

    return filtered;
  }, [subscriptions, statusFilter, planFilter, searchText, sortBy]);

  const handleCreatePlan = (formData: FormData) => {
    const data = {
      name: formData.get("name") as string,
      price: formData.get("price") as string,
      currency: formData.get("currency") as string,
      description: formData.get("description") as string,
      logo: selectedBadge,
      features: (formData.get("features") as string).split("\n").filter(f => f.trim()),
      maxUniversities: parseInt(formData.get("maxUniversities") as string),
      maxCountries: parseInt(formData.get("maxCountries") as string),
      universityTier: formData.get("universityTier") as string,
      supportType: formData.get("supportType") as string,
      turnaroundDays: parseInt(formData.get("turnaroundDays") as string),
      includeLoanAssistance: formData.get("includeLoanAssistance") === "on",
      includeVisaSupport: formData.get("includeVisaSupport") === "on",
      includeCounselorSession: formData.get("includeCounselorSession") === "on",
      includeScholarshipPlanning: formData.get("includeScholarshipPlanning") === "on",
      includeMockInterview: formData.get("includeMockInterview") === "on",
      includeExpertEditing: formData.get("includeExpertEditing") === "on",
      includePostAdmitSupport: formData.get("includePostAdmitSupport") === "on",
      includeDedicatedManager: formData.get("includeDedicatedManager") === "on",
      includeNetworkingEvents: formData.get("includeNetworkingEvents") === "on",
      includeFlightAccommodation: formData.get("includeFlightAccommodation") === "on",
      isBusinessFocused: formData.get("isBusinessFocused") === "on",
      tierLevel: parseInt(formData.get("tierLevel") as string),
      displayOrder: parseInt(formData.get("displayOrder") as string) || 0,
      isActive: formData.get("isActive") === "on",
    };
    createPlanMutation.mutate(data);
  };

  const handleUpdatePlan = (plan: SubscriptionPlan, formData: FormData) => {
    const updates = {
      name: formData.get("name") as string,
      price: formData.get("price") as string,
      currency: formData.get("currency") as string,
      description: formData.get("description") as string,
      logo: editSelectedBadge,
      features: (formData.get("features") as string).split("\n").filter(f => f.trim()),
      maxUniversities: parseInt(formData.get("maxUniversities") as string),
      maxCountries: parseInt(formData.get("maxCountries") as string),
      universityTier: formData.get("universityTier") as string,
      supportType: formData.get("supportType") as string,
      turnaroundDays: parseInt(formData.get("turnaroundDays") as string),
      includeLoanAssistance: formData.get("includeLoanAssistance") === "on",
      includeVisaSupport: formData.get("includeVisaSupport") === "on",
      includeCounselorSession: formData.get("includeCounselorSession") === "on",
      includeScholarshipPlanning: formData.get("includeScholarshipPlanning") === "on",
      includeMockInterview: formData.get("includeMockInterview") === "on",
      includeExpertEditing: formData.get("includeExpertEditing") === "on",
      includePostAdmitSupport: formData.get("includePostAdmitSupport") === "on",
      includeDedicatedManager: formData.get("includeDedicatedManager") === "on",
      includeNetworkingEvents: formData.get("includeNetworkingEvents") === "on",
      includeFlightAccommodation: formData.get("includeFlightAccommodation") === "on",
      isBusinessFocused: formData.get("isBusinessFocused") === "on",
      tierLevel: parseInt(formData.get("tierLevel") as string),
      displayOrder: parseInt(formData.get("displayOrder") as string) || 0,
      isActive: formData.get("isActive") === "on",
    };
    updatePlanMutation.mutate({ id: plan.id, updates });
  };

  const safeBadgeKey = (badge: string | undefined | null): BadgeKey => {
    if (!badge) return 'platinum';
    if (badge in premiumBadges) return badge as BadgeKey;
    return 'platinum';
  };

  const getPlanIcon = (tier: string) => {
    switch (tier) {
      case "top100": return <Crown className="h-5 w-5 text-yellow-600" />;
      case "top200": return <Crown className="h-5 w-5 text-purple-600" />;
      case "top500": return <Crown className="h-5 w-5 text-blue-600" />;
      default: return <DollarSign className="h-5 w-5 text-green-600" />;
    }
  };

  const getSupportBadgeColor = (supportType: string) => {
    switch (supportType) {
      case "premium": return "bg-yellow-100 text-yellow-800";
      case "phone": return "bg-purple-100 text-purple-800";
      case "whatsapp": return "bg-green-100 text-green-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "expired": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  const getNextTierLevel = () => {
    if (plans.length === 0) return 1;
    const maxTierLevel = Math.max(...plans.map(plan => plan.tierLevel || 0));
    return maxTierLevel + 1;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSubscriberCount = (planId: string) => {
    return subscriptions.filter(sub => 
      sub.plan.id === planId && 
      (sub.subscription.status === 'active' || sub.subscription.status === 'pending')
    ).length;
  };

  const calculatePercentageChange = (oldPrice: number, newPrice: number) => {
    const change = ((newPrice - oldPrice) / oldPrice) * 100;
    return change.toFixed(1);
  };

  const getEffectiveDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  };

  const handleCreateVersionWithNotification = () => {
    if (!createVersionDialog.plan) return;
    
    createVersionMutation.mutate({
      planId: createVersionDialog.plan.id,
      updates: {
        price: createVersionDialog.newPrice
      },
      notifySubscribers
    });
  };

  if (plansLoading || subscriptionsLoading) {
    return <div className="flex items-center justify-center h-96">Loading subscription data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Subscription Management</h1>
          <p className="text-gray-600 mt-1">Manage subscription plans and user subscriptions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Subscription Plan</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleCreatePlan(new FormData(e.currentTarget));
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Plan Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input id="price" name="price" type="number" step="0.01" required />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select name="currency" defaultValue="USD">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tierLevel">Tier Level</Label>
                  <Input 
                    id="tierLevel" 
                    name="tierLevel" 
                    type="number" 
                    min="1"
                    step="1"
                    defaultValue={getNextTierLevel()} 
                    required 
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Unique hierarchical level for this plan
                  </p>
                </div>
                <div>
                  <Label htmlFor="displayOrder">Display Order</Label>
                  <Input id="displayOrder" name="displayOrder" type="number" defaultValue="0" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" />
              </div>

              <PremiumBadgeSelector 
                selectedBadge={selectedBadge} 
                onBadgeChange={setSelectedBadge} 
              />

              <div>
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea id="features" name="features" rows={6} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="maxUniversities">Max Universities</Label>
                  <Input id="maxUniversities" name="maxUniversities" type="number" required />
                </div>
                <div>
                  <Label htmlFor="maxCountries">Max Countries</Label>
                  <Input id="maxCountries" name="maxCountries" type="number" required />
                </div>
                <div>
                  <Label htmlFor="turnaroundDays">Turnaround Days</Label>
                  <Input id="turnaroundDays" name="turnaroundDays" type="number" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="universityTier">University Tier</Label>
                  <Select name="universityTier" defaultValue="general">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="top500">Top 500</SelectItem>
                      <SelectItem value="top200">Top 200</SelectItem>
                      <SelectItem value="top100">Top 100</SelectItem>
                      <SelectItem value="ivy_league">Ivy League</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="supportType">Support Type</Label>
                  <Select name="supportType" defaultValue="email">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "includeLoanAssistance", label: "Loan Assistance" },
                  { key: "includeVisaSupport", label: "Visa Support" },
                  { key: "includeCounselorSession", label: "Counselor Session" },
                  { key: "includeScholarshipPlanning", label: "Scholarship Planning" },
                  { key: "includeMockInterview", label: "Mock Interview" },
                  { key: "includeExpertEditing", label: "Expert Editing" },
                  { key: "includePostAdmitSupport", label: "Post-Admit Support" },
                  { key: "includeDedicatedManager", label: "Dedicated Manager" },
                  { key: "includeNetworkingEvents", label: "Networking Events" },
                  { key: "includeFlightAccommodation", label: "Flight & Accommodation" },
                  { key: "isBusinessFocused", label: "Business Focused" },
                  { key: "isActive", label: "Active" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center space-x-2">
                    <input type="checkbox" id={item.key} name={item.key} />
                    <Label htmlFor={item.key}>{item.label}</Label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPlanMutation.isPending}>
                  {createPlanMutation.isPending ? "Creating..." : "Create Plan"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="subscriptions">User Subscriptions ({subscriptions.length})</TabsTrigger>
          <TabsTrigger value="failed-payments">Failed Payments ({failedPayments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${!plan.isActive ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <PremiumBadgeDisplay badge={safeBadgeKey(plan.logo)} className="w-10 h-10" showTooltip={true} />
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                    </div>
                    <Badge className={getSupportBadgeColor(plan.supportType)}>
                      {plan.supportType}
                    </Badge>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-bold text-blue-600">
                      ${plan.price}
                    </span>
                    <span className="text-sm text-gray-500">{plan.currency}</span>
                  </div>
                  <p className="text-sm text-gray-600">{plan.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Universities: <span className="font-semibold">{plan.maxUniversities}</span></div>
                    <div>Countries: <span className="font-semibold">{plan.maxCountries}</span></div>
                    <div className="col-span-2">
                      Turnaround: <span className="font-semibold">{plan.turnaroundDays} days</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm">Features:</h4>
                    <ul className="text-xs space-y-1">
                      {plan.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-500 mr-1">✓</span>
                          {feature}
                        </li>
                      ))}
                      {plan.features.length > 3 && (
                        <li className="text-gray-500">+{plan.features.length - 3} more features</li>
                      )}
                    </ul>
                  </div>

                  <div className="flex flex-col space-y-2 pt-2">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingPlan(plan);
                          setEditSelectedBadge(safeBadgeKey(plan.logo));
                        }}
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPlanForVersions(plan.id);
                        }}
                        className="flex-1"
                        title="View Version History"
                      >
                        <History className="h-3 w-3 mr-1" />
                        Versions
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deletePlanMutation.mutate(plan.id)}
                        disabled={deletePlanMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingPlan(plan);
                          setPriceUpdateDialogOpen(true);
                        }}
                        className="flex-1"
                      >
                        <DollarSign className="h-3 w-3 mr-1" />
                        Update Price
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingPlan(plan);
                          setDeprecationDialogOpen(true);
                        }}
                        className="flex-1 text-yellow-600 hover:text-yellow-700"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Deprecate
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setCreateVersionDialog({ open: true, plan, newPrice: plan.price })}
                      className="w-full"
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Create New Version
                    </Button>
                  </div>
                </CardContent>

                {!plan.isActive && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary">Inactive</Badge>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                User Subscriptions ({filteredAndSortedSubscriptions.length})
              </CardTitle>
              <CardDescription>
                Manage and monitor all user subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search User</Label>
                  <Input
                    id="search"
                    placeholder="Email or name..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="plan-filter">Plan</Label>
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger id="plan-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      {plans.map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sort-by">Sort By</Label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger id="sort-by">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date (Newest)</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="plan">Plan Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount Paid</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedSubscriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No subscriptions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedSubscriptions.map((sub) => (
                        <TableRow key={sub.subscription.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {sub.user.firstName} {sub.user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{sub.user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{sub.plan.name}</div>
                              <div className="text-sm text-gray-500">
                                Current: ${sub.plan.price} {sub.plan.currency}
                              </div>
                              {sub.subscription.isGrandfathered && sub.subscription.grandfatheredPrice && (
                                <div className="text-xs text-amber-600 mt-1">
                                  Grandfathered: ${sub.subscription.grandfatheredPrice}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge className={getStatusBadgeColor(sub.subscription.status)}>
                                {sub.subscription.status}
                              </Badge>
                              {sub.subscription.isGrandfathered && (
                                <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900 text-xs">
                                  🔒 Locked
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {sub.subscription.amountPaid ? (
                              <div>
                                <span className="font-medium">
                                  ${sub.subscription.amountPaid} {sub.subscription.currency}
                                </span>
                                {sub.subscription.isGrandfathered && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    (Price locked)
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(sub.subscription.paidAt)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(sub.subscription.startedAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPaymentHistoryDialog({ open: true, userId: sub.user.id })}
                                title="View Payment History"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEventsDialog({ open: true, userId: sub.user.id })}
                                title="View Subscription Events"
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setUpgradeDialog({ open: true, subscription: sub })}
                                title="Manually Upgrade"
                              >
                                <TrendingUp className="h-4 w-4" />
                              </Button>
                              {sub.subscription.status === "active" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setCancelDialog({ 
                                    open: true, 
                                    subscriptionId: sub.subscription.id,
                                    userEmail: sub.user.email 
                                  })}
                                  title="Cancel Subscription"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed-payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                Failed Payments ({failedPayments.length})
              </CardTitle>
              <CardDescription>
                Monitor and manage failed payment attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Failure Reason</TableHead>
                      <TableHead>Error Code</TableHead>
                      <TableHead>Failed Date</TableHead>
                      <TableHead>Notified</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedPaymentsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading failed payments...
                        </TableCell>
                      </TableRow>
                    ) : failedPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No failed payments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      failedPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {payment.userFirstName} {payment.userLastName}
                              </div>
                              <div className="text-sm text-gray-500">{payment.userEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{payment.planName || "N/A"}</div>
                              {payment.planPrice && (
                                <div className="text-sm text-gray-500">
                                  ${payment.planPrice}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {payment.amount ? (
                              <span className="font-medium">
                                ${payment.amount} {payment.currency}
                              </span>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={payment.failureReason || "Unknown"}>
                              {payment.failureReason || "Unknown"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {payment.razorpayErrorCode || "N/A"}
                            </code>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDateTime(payment.failedAt)}
                          </TableCell>
                          <TableCell>
                            {payment.notifiedAt ? (
                              <Badge className="bg-green-100 text-green-800">Yes</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800">No</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={paymentHistoryDialog.open} onOpenChange={(open) => !open && setPaymentHistoryDialog({ open: false, userId: null })}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>View all payment transactions for this user</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {paymentHistoryLoading ? (
              <div className="py-8 text-center">Loading payment history...</div>
            ) : paymentHistory.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No payment history found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Gateway</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.map((payment) => (
                    <TableRow key={payment.subscriptionId}>
                      <TableCell className="font-medium">{payment.planName}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {payment.orderId || "N/A"}
                        </code>
                      </TableCell>
                      <TableCell>
                        ${payment.amountPaid} {payment.currency}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(payment.paidAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.paymentGateway || "N/A"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={eventsDialog.open} onOpenChange={(open) => !open && setEventsDialog({ open: false, userId: null })}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Subscription Events</DialogTitle>
            <DialogDescription>Timeline of subscription lifecycle events</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {eventsLoading ? (
              <div className="py-8 text-center">Loading subscription events...</div>
            ) : subscriptionEvents.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No subscription events found</div>
            ) : (
              <div className="space-y-4">
                {subscriptionEvents.map((event) => (
                  <div key={event.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-sm">{event.eventType}</div>
                        {event.oldStatus && event.newStatus && (
                          <div className="text-sm text-gray-600">
                            Status: <Badge className="mr-1">{event.oldStatus}</Badge> → <Badge>{event.newStatus}</Badge>
                          </div>
                        )}
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            <code className="bg-gray-100 px-2 py-1 rounded">
                              {JSON.stringify(event.metadata, null, 2)}
                            </code>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateTime(event.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelDialog.open} onOpenChange={(open) => !open && setCancelDialog({ open: false, subscriptionId: null, userEmail: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the subscription for <strong>{cancelDialog.userEmail}</strong>? 
              This action will immediately cancel the subscription and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (cancelDialog.subscriptionId) {
                  cancelSubscriptionMutation.mutate(cancelDialog.subscriptionId);
                }
              }}
            >
              Yes, Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={upgradeDialog.open} onOpenChange={(open) => !open && setUpgradeDialog({ open: false, subscription: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manually Upgrade User</DialogTitle>
            <DialogDescription>
              Upgrade {upgradeDialog.subscription?.user.email} to a new subscription plan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Plan</Label>
              <div className="text-sm font-medium">{upgradeDialog.subscription?.plan.name}</div>
            </div>
            <div>
              <Label htmlFor="upgrade-plan">New Plan</Label>
              <Select value={selectedUpgradePlan} onValueChange={setSelectedUpgradePlan}>
                <SelectTrigger id="upgrade-plan">
                  <SelectValue placeholder="Select a plan..." />
                </SelectTrigger>
                <SelectContent>
                  {plans
                    .filter(plan => plan.isActive && plan.id !== upgradeDialog.subscription?.plan.id)
                    .map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - ${plan.price} {plan.currency}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialog({ open: false, subscription: null })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast({ 
                  title: "Feature Coming Soon", 
                  description: "Manual upgrade functionality will be implemented in the next phase.",
                  variant: "default"
                });
              }}
              disabled={!selectedUpgradePlan}
            >
              Create Upgrade Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingPlan && (
        <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Subscription Plan</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdatePlan(editingPlan, new FormData(e.currentTarget));
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Plan Name</Label>
                  <Input id="edit-name" name="name" defaultValue={editingPlan.name} required />
                </div>
                <div>
                  <Label htmlFor="edit-price">Price</Label>
                  <Input id="edit-price" name="price" type="number" step="0.01" defaultValue={editingPlan.price} required />
                </div>
                <div>
                  <Label htmlFor="edit-currency">Currency</Label>
                  <Select name="currency" defaultValue={editingPlan.currency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-tierLevel">Tier Level</Label>
                  <Input 
                    id="edit-tierLevel" 
                    name="tierLevel" 
                    type="number" 
                    min="1"
                    step="1"
                    defaultValue={editingPlan.tierLevel} 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-displayOrder">Display Order</Label>
                  <Input id="edit-displayOrder" name="displayOrder" type="number" defaultValue={editingPlan.displayOrder} />
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea id="edit-description" name="description" defaultValue={editingPlan.description} />
              </div>

              <PremiumBadgeSelector 
                selectedBadge={editSelectedBadge} 
                onBadgeChange={setEditSelectedBadge} 
              />

              <div>
                <Label htmlFor="edit-features">Features (one per line)</Label>
                <Textarea 
                  id="edit-features" 
                  name="features" 
                  rows={6} 
                  defaultValue={editingPlan.features.join("\n")} 
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-maxUniversities">Max Universities</Label>
                  <Input id="edit-maxUniversities" name="maxUniversities" type="number" defaultValue={editingPlan.maxUniversities} required />
                </div>
                <div>
                  <Label htmlFor="edit-maxCountries">Max Countries</Label>
                  <Input id="edit-maxCountries" name="maxCountries" type="number" defaultValue={editingPlan.maxCountries} required />
                </div>
                <div>
                  <Label htmlFor="edit-turnaroundDays">Turnaround Days</Label>
                  <Input id="edit-turnaroundDays" name="turnaroundDays" type="number" defaultValue={editingPlan.turnaroundDays} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-universityTier">University Tier</Label>
                  <Select name="universityTier" defaultValue={editingPlan.universityTier}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="top500">Top 500</SelectItem>
                      <SelectItem value="top200">Top 200</SelectItem>
                      <SelectItem value="top100">Top 100</SelectItem>
                      <SelectItem value="ivy_league">Ivy League</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-supportType">Support Type</Label>
                  <Select name="supportType" defaultValue={editingPlan.supportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "includeLoanAssistance", label: "Loan Assistance" },
                  { key: "includeVisaSupport", label: "Visa Support" },
                  { key: "includeCounselorSession", label: "Counselor Session" },
                  { key: "includeScholarshipPlanning", label: "Scholarship Planning" },
                  { key: "includeMockInterview", label: "Mock Interview" },
                  { key: "includeExpertEditing", label: "Expert Editing" },
                  { key: "includePostAdmitSupport", label: "Post-Admit Support" },
                  { key: "includeDedicatedManager", label: "Dedicated Manager" },
                  { key: "includeNetworkingEvents", label: "Networking Events" },
                  { key: "includeFlightAccommodation", label: "Flight & Accommodation" },
                  { key: "isBusinessFocused", label: "Business Focused" },
                  { key: "isActive", label: "Active" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id={`edit-${item.key}`} 
                      name={item.key} 
                      defaultChecked={editingPlan[item.key as keyof SubscriptionPlan] as boolean}
                    />
                    <Label htmlFor={`edit-${item.key}`}>{item.label}</Label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingPlan(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePlanMutation.isPending}>
                  {updatePlanMutation.isPending ? "Updating..." : "Update Plan"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={createVersionDialog.open} onOpenChange={(open) => !open && setCreateVersionDialog({ open: false, plan: null, newPrice: "" })}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Version & Notify Subscribers?</AlertDialogTitle>
            <AlertDialogDescription>
              {createVersionDialog.plan && (
                <>
                  This will create a new version of <strong>{createVersionDialog.plan.name}</strong> and notify{" "}
                  {getSubscriberCount(createVersionDialog.plan.id)} existing subscribers.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {createVersionDialog.plan && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-price">New Price</Label>
                <Input
                  id="new-price"
                  type="number"
                  step="0.01"
                  value={createVersionDialog.newPrice}
                  onChange={(e) => setCreateVersionDialog({ ...createVersionDialog, newPrice: e.target.value })}
                  className="mt-1"
                />
              </div>

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertTitle>Notification Preview</AlertTitle>
                <AlertDescription className="mt-2 p-4 bg-muted rounded-md space-y-2">
                  <div>
                    <strong>Subject:</strong>{" "}
                    {Number(createVersionDialog.newPrice) > Number(createVersionDialog.plan.price)
                      ? `Price Increase Notice: ${createVersionDialog.plan.name}`
                      : `Price Reduction Notice: ${createVersionDialog.plan.name}`}
                  </div>

                  <div className="text-sm leading-relaxed">
                    We're writing to inform you of an upcoming price change for your{" "}
                    <strong>{createVersionDialog.plan.name}</strong> subscription. Effective{" "}
                    <strong>{formatDate(getEffectiveDate().toISOString())}</strong>, the price will{" "}
                    {Number(createVersionDialog.newPrice) > Number(createVersionDialog.plan.price)
                      ? "increase"
                      : "decrease"}{" "}
                    from <strong>{createVersionDialog.plan.currency} {createVersionDialog.plan.price}</strong> to{" "}
                    <strong>{createVersionDialog.plan.currency} {createVersionDialog.newPrice}</strong> (
                    {calculatePercentageChange(
                      Number(createVersionDialog.plan.price),
                      Number(createVersionDialog.newPrice)
                    )}
                    % change).
                  </div>

                  <div className="text-sm font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                    Your current pricing of {createVersionDialog.plan.currency} {createVersionDialog.plan.price} is
                    grandfathered and will NOT change.
                  </div>

                  <div className="text-sm text-muted-foreground">
                    This new pricing applies only to new subscribers.
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifySubscribers"
                  checked={notifySubscribers}
                  onCheckedChange={(checked) => setNotifySubscribers(checked as boolean)}
                />
                <Label htmlFor="notifySubscribers" className="text-sm font-normal cursor-pointer">
                  Send notifications to {getSubscriberCount(createVersionDialog.plan.id)} subscribers
                </Label>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateVersionWithNotification}
              disabled={createVersionMutation.isPending}
            >
              {createVersionMutation.isPending ? "Creating..." : "Create & Notify"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
