import { useState, useMemo, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Edit, Trash2, DollarSign, Users, Crown, Eye, XCircle, TrendingUp, AlertTriangle, FileText, Clock, Mail, Bell, History, Inbox, Info, BookOpen, MessageCircle, Brain, Banknote, Plane, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { PremiumBadgeSelector, PremiumBadgeDisplay, BadgeKey, premiumBadges } from "@/components/PremiumBadges";
import { useAuth } from "@/hooks/useAuth";
import PlanVersionHistory from "@/components/admin/PlanVersionHistory";
import PriceUpdateDialog from "@/components/admin/PriceUpdateDialog";
import PlanDeprecationDialog from "@/components/admin/PlanDeprecationDialog";
import BulkSubscriptionOperations from "@/components/admin/BulkSubscriptionOperations";
import LifetimeAnalyticsDashboard from "@/components/admin/LifetimeAnalyticsDashboard";
import { formatCurrency } from "@/lib/currency";

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
  
  includeCourseCountrySelection?: boolean;
  includeUniversityShortlisting?: boolean;
  includeOneOnOneEditing?: boolean;
  includeProfileBuilding?: boolean;
  includeTop50Counselling?: boolean;
  
  supportTypes?: string[];
  
  phozosAiTier?: string;
  
  includeForexServices?: boolean;
  
  includePreDepartureSession?: boolean;
  
  phozosPrepTier?: string;
  phozosPrepDescription?: string | null;
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
  id: string;
  userId: string;
  planId: string | null;
  planName: string | null;
  paymentType: string;
  amount: string;
  currency: string;
  orderId: string;
  paymentReference: string;
  paymentGateway: string;
  paidAt: string;
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
  
  const [selectedSupportTypes, setSelectedSupportTypes] = useState<string[]>(["email"]);
  const [editSupportTypes, setEditSupportTypes] = useState<string[]>(["email"]);
  const [phozosAiTier, setPhozosAiTier] = useState<string>("none");
  const [phozosPrepTier, setPhozosPrepTier] = useState<string>("none");
  const [editPhozosAiTier, setEditPhozosAiTier] = useState<string>("none");
  const [editPhozosPrepTier, setEditPhozosPrepTier] = useState<string>("none");
  
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
  const [deletePlanDialog, setDeletePlanDialog] = useState<{ open: boolean; plan: SubscriptionPlan | null; subscriberCount: number }>({ open: false, plan: null, subscriberCount: 0 });
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  
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
        setDeletePlanDialog({ open: false, plan: null, subscriberCount: 0 });
        setDeleteConfirmationText("");
        toast({ title: "Success", description: "Subscription plan deleted successfully" });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to delete subscription plan", variant: "destructive" });
      },
    }
  );

  useEffect(() => {
    if (editingPlan) {
      setEditSelectedBadge(safeBadgeKey(editingPlan.logo));
      setEditSupportTypes(editingPlan.supportTypes || [editingPlan.supportType] || ["email"]);
      setEditPhozosAiTier(editingPlan.phozosAiTier || "none");
      setEditPhozosPrepTier(editingPlan.phozosPrepTier || "none");
    }
  }, [editingPlan]);

  const getActiveSubscriberCount = (planId: string): number => {
    return subscriptions.filter(
      sub => sub.plan.id === planId && sub.subscription.status === 'active'
    ).length;
  };

  const handleDeletePlanClick = (plan: SubscriptionPlan) => {
    const subscriberCount = getActiveSubscriberCount(plan.id);
    setDeletePlanDialog({ open: true, plan, subscriberCount });
    setDeleteConfirmationText("");
  };

  const handleConfirmDeletePlan = () => {
    if (deletePlanDialog.plan && deleteConfirmationText === "DELETE") {
      deletePlanMutation.mutate(deletePlanDialog.plan.id);
    }
  };

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
      
      includeCourseCountrySelection: formData.get("includeCourseCountrySelection") === "on",
      includeUniversityShortlisting: formData.get("includeUniversityShortlisting") === "on",
      includeExpertEditing: formData.get("includeExpertEditing") === "on",
      includeOneOnOneEditing: formData.get("includeOneOnOneEditing") === "on",
      includeProfileBuilding: formData.get("includeProfileBuilding") === "on",
      includeTop50Counselling: formData.get("includeTop50Counselling") === "on",
      
      supportTypes: selectedSupportTypes,
      includeDedicatedManager: formData.get("includeDedicatedManager") === "on",
      
      phozosAiTier,
      
      includeScholarshipPlanning: formData.get("includeScholarshipPlanning") === "on",
      includeLoanAssistance: formData.get("includeLoanAssistance") === "on",
      includeForexServices: formData.get("includeForexServices") === "on",
      
      includeVisaSupport: formData.get("includeVisaSupport") === "on",
      includePreDepartureSession: formData.get("includePreDepartureSession") === "on",
      includeMockInterview: formData.get("includeMockInterview") === "on",
      includeFlightAccommodation: formData.get("includeFlightAccommodation") === "on",
      
      phozosPrepTier,
      phozosPrepDescription: formData.get("phozosPrepDescription") as string || null,
      
      includeCounselorSession: formData.get("includeCounselorSession") === "on",
      includePostAdmitSupport: formData.get("includePostAdmitSupport") === "on",
      includeNetworkingEvents: formData.get("includeNetworkingEvents") === "on",
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
      
      includeCourseCountrySelection: formData.get("includeCourseCountrySelection") === "on",
      includeUniversityShortlisting: formData.get("includeUniversityShortlisting") === "on",
      includeExpertEditing: formData.get("includeExpertEditing") === "on",
      includeOneOnOneEditing: formData.get("includeOneOnOneEditing") === "on",
      includeProfileBuilding: formData.get("includeProfileBuilding") === "on",
      includeTop50Counselling: formData.get("includeTop50Counselling") === "on",
      
      supportTypes: editSupportTypes,
      includeDedicatedManager: formData.get("includeDedicatedManager") === "on",
      
      phozosAiTier: editPhozosAiTier,
      
      includeScholarshipPlanning: formData.get("includeScholarshipPlanning") === "on",
      includeLoanAssistance: formData.get("includeLoanAssistance") === "on",
      includeForexServices: formData.get("includeForexServices") === "on",
      
      includeVisaSupport: formData.get("includeVisaSupport") === "on",
      includePreDepartureSession: formData.get("includePreDepartureSession") === "on",
      includeMockInterview: formData.get("includeMockInterview") === "on",
      includeFlightAccommodation: formData.get("includeFlightAccommodation") === "on",
      
      phozosPrepTier: editPhozosPrepTier,
      phozosPrepDescription: formData.get("phozosPrepDescription") as string || null,
      
      includeCounselorSession: formData.get("includeCounselorSession") === "on",
      includePostAdmitSupport: formData.get("includePostAdmitSupport") === "on",
      includeNetworkingEvents: formData.get("includeNetworkingEvents") === "on",
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
              setIsCreateDialogOpen(false);
              setSelectedSupportTypes(["email"]);
              setPhozosAiTier("none");
              setPhozosPrepTier("none");
            }} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
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
                    <Select name="currency" defaultValue="INR">
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
                    <p className="text-xs text-gray-500 mt-1">Unique hierarchical level</p>
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
                  <Textarea id="features" name="features" rows={4} />
                </div>
              </div>

              <Card className="border-blue-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-base">Category 1: Core Application Services</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="maxCountries">No. of Countries</Label>
                      <Input id="maxCountries" name="maxCountries" type="number" required />
                    </div>
                    <div>
                      <Label htmlFor="maxUniversities">No. of Universities</Label>
                      <Input id="maxUniversities" name="maxUniversities" type="number" required />
                    </div>
                    <div>
                      <Label htmlFor="turnaroundDays">Turnaround Days</Label>
                      <Input id="turnaroundDays" name="turnaroundDays" type="number" required />
                    </div>
                  </div>
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
                  <div className="space-y-2">
                    {[
                      { key: "includeCourseCountrySelection", label: "Course & Country Selection" },
                      { key: "includeUniversityShortlisting", label: "University Shortlisting" },
                      { key: "includeExpertEditing", label: "SOP, LOR, Resume, Essays Reviews" },
                      { key: "includeOneOnOneEditing", label: "1:1 Document Editing" },
                      { key: "includeProfileBuilding", label: "Comprehensive Profile-building" },
                      { key: "includeTop50Counselling", label: "Top 50 University-specific Counselling" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center space-x-2">
                        <input type="checkbox" id={item.key} name={item.key} className="rounded" />
                        <Label htmlFor={item.key} className="font-normal cursor-pointer">{item.label}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-base">Category 2: Student Support & Mentorship</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Support Channels (Select all that apply)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "email", label: "Email Support" },
                        { value: "whatsapp", label: "WhatsApp Support" },
                        { value: "phone", label: "Phone Support" },
                        { value: "premium", label: "Premium Support" },
                      ].map((support) => (
                        <div key={support.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`support-${support.value}`}
                            checked={selectedSupportTypes.includes(support.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSupportTypes([...selectedSupportTypes, support.value]);
                              } else {
                                setSelectedSupportTypes(selectedSupportTypes.filter(t => t !== support.value));
                              }
                            }}
                          />
                          <Label htmlFor={`support-${support.value}`} className="font-normal cursor-pointer">
                            {support.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <input type="hidden" name="supportType" value={selectedSupportTypes[0] || "email"} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="includeDedicatedManager" name="includeDedicatedManager" className="rounded" />
                    <Label htmlFor="includeDedicatedManager" className="font-normal cursor-pointer">Dedicated Manager</Label>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-base">Category 3: Phozos AI</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Label className="mb-3 block">AI Tier</Label>
                  <RadioGroup value={phozosAiTier} onValueChange={setPhozosAiTier} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="none" id="ai-none" />
                      <Label htmlFor="ai-none" className="font-normal cursor-pointer">None</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="basic" id="ai-basic" />
                      <Label htmlFor="ai-basic" className="font-normal cursor-pointer">Basic</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pro" id="ai-pro" />
                      <Label htmlFor="ai-pro" className="font-normal cursor-pointer">Pro</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ultra" id="ai-ultra" />
                      <Label htmlFor="ai-ultra" className="font-normal cursor-pointer">Ultra</Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card className="border-yellow-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-yellow-600" />
                    <CardTitle className="text-base">Category 4: Financial & Scholarship Services</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { key: "includeScholarshipPlanning", label: "Scholarship Assistance" },
                    { key: "includeLoanAssistance", label: "Phozos Finance (Loan Assistance)" },
                    { key: "includeForexServices", label: "Forex Services" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center space-x-2">
                      <input type="checkbox" id={item.key} name={item.key} className="rounded" />
                      <Label htmlFor={item.key} className="font-normal cursor-pointer">{item.label}</Label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-orange-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Plane className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-base">Category 5: Visa & Post-Admission</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { key: "includeVisaSupport", label: "Visa Guidance" },
                    { key: "includePreDepartureSession", label: "Pre-departure Session" },
                    { key: "includeMockInterview", label: "Mock Interview Classes" },
                    { key: "includeFlightAccommodation", label: "Flight & Accommodation Services" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center space-x-2">
                      <input type="checkbox" id={item.key} name={item.key} className="rounded" />
                      <Label htmlFor={item.key} className="font-normal cursor-pointer">{item.label}</Label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-indigo-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-indigo-600" />
                    <CardTitle className="text-base">Category 6: Phozos Prep</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-3 block">Prep Tier</Label>
                    <RadioGroup value={phozosPrepTier} onValueChange={setPhozosPrepTier} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="prep-none" />
                        <Label htmlFor="prep-none" className="font-normal cursor-pointer">None</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="basic" id="prep-basic" />
                        <Label htmlFor="prep-basic" className="font-normal cursor-pointer">Basic</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pro" id="prep-pro" />
                        <Label htmlFor="prep-pro" className="font-normal cursor-pointer">Pro</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ultra" id="prep-ultra" />
                        <Label htmlFor="prep-ultra" className="font-normal cursor-pointer">Ultra</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor="phozosPrepDescription">Description</Label>
                    <Textarea 
                      id="phozosPrepDescription" 
                      name="phozosPrepDescription" 
                      placeholder="Describe Phozos Prep benefits (optional)..." 
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Additional Settings</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "includeCounselorSession", label: "Counselor Session (Legacy)" },
                    { key: "includePostAdmitSupport", label: "Post-Admit Support (Legacy)" },
                    { key: "includeNetworkingEvents", label: "Networking Events (Legacy)" },
                    { key: "isBusinessFocused", label: "Business Focused" },
                    { key: "isActive", label: "Active" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center space-x-2">
                      <input type="checkbox" id={item.key} name={item.key} defaultChecked={item.key === "isActive"} className="rounded" />
                      <Label htmlFor={item.key} className="font-normal cursor-pointer text-sm">{item.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
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
          <TabsTrigger value="bulk-operations">Bulk Operations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          {plans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 px-4">
                <Inbox className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Subscription Plans Yet</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Get started by creating your first subscription plan. Define pricing, features, and benefits for your users.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Plan
                </Button>
              </CardContent>
            </Card>
          ) : (
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
                      {formatCurrency(plan.price, plan.currency)}
                    </span>
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
                        onClick={() => handleDeletePlanClick(plan)}
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
          )}
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
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center">
                            <Info className="h-12 w-12 text-muted-foreground mb-3" />
                            <h3 className="text-lg font-semibold mb-1">No Subscriptions Found</h3>
                            <p className="text-muted-foreground text-sm max-w-md">
                              {subscriptions.length === 0 
                                ? "No users have subscribed yet. Once users subscribe to a plan, they'll appear here." 
                                : "No subscriptions match your current filters. Try adjusting your search criteria or filters."}
                            </p>
                            {subscriptions.length > 0 && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-4"
                                onClick={() => {
                                  setSearchText("");
                                  setStatusFilter("all");
                                  setPlanFilter("all");
                                }}
                              >
                                Clear All Filters
                              </Button>
                            )}
                          </div>
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
                                Current: {formatCurrency(sub.plan.price, sub.plan.currency)}
                              </div>
                              {sub.subscription.isGrandfathered && sub.subscription.grandfatheredPrice && (
                                <div className="text-xs text-amber-600 mt-1">
                                  Grandfathered: {formatCurrency(sub.subscription.grandfatheredPrice, sub.plan.currency)}
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
                                  {formatCurrency(sub.subscription.amountPaid, sub.subscription.currency || sub.plan.currency)}
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
                                {formatCurrency(payment.amount, payment.currency || 'INR')}
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

        <TabsContent value="bulk-operations">
          <BulkSubscriptionOperations plans={plans} />
        </TabsContent>

        <TabsContent value="analytics">
          <LifetimeAnalyticsDashboard />
        </TabsContent>
      </Tabs>

      <Dialog open={paymentHistoryDialog.open} onOpenChange={(open) => !open && setPaymentHistoryDialog({ open: false, userId: null })}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>View all payment transactions for this user</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {paymentHistoryLoading ? (
              <div className="py-8 text-center">Loading payment history...</div>
            ) : paymentHistory.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No payment history available</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.map((payment) => {
                    const getBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
                      switch (type) {
                        case 'Initial Purchase':
                          return 'default';
                        case 'Upgrade':
                          return 'secondary';
                        case 'Renewal':
                          return 'outline';
                        default:
                          return 'outline';
                      }
                    };

                    const getBadgeClassName = (type: string): string => {
                      switch (type) {
                        case 'Initial Purchase':
                          return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
                        case 'Upgrade':
                          return 'bg-green-100 text-green-800 hover:bg-green-100';
                        case 'Renewal':
                          return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
                        default:
                          return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
                      }
                    };

                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.planName || "Unknown Plan"}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {payment.orderId || "N/A"}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(payment.paidAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.paymentGateway || "N/A"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getBadgeVariant(payment.paymentType)}
                            className={getBadgeClassName(payment.paymentType)}
                          >
                            {payment.paymentType}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                        {plan.name} - {formatCurrency(plan.price, plan.currency)}
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
              setEditingPlan(null);
            }} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
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
                    <p className="text-xs text-gray-500 mt-1">Unique hierarchical level</p>
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
                  <Textarea id="edit-features" name="features" rows={4} defaultValue={editingPlan.features.join("\n")} />
                </div>
              </div>

              <Card className="border-blue-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-base">Category 1: Core Application Services</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-maxCountries">No. of Countries</Label>
                      <Input id="edit-maxCountries" name="maxCountries" type="number" defaultValue={editingPlan.maxCountries} required />
                    </div>
                    <div>
                      <Label htmlFor="edit-maxUniversities">No. of Universities</Label>
                      <Input id="edit-maxUniversities" name="maxUniversities" type="number" defaultValue={editingPlan.maxUniversities} required />
                    </div>
                    <div>
                      <Label htmlFor="edit-turnaroundDays">Turnaround Days</Label>
                      <Input id="edit-turnaroundDays" name="turnaroundDays" type="number" defaultValue={editingPlan.turnaroundDays} required />
                    </div>
                  </div>
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
                  <div className="space-y-2">
                    {[
                      { key: "includeCourseCountrySelection", label: "Course & Country Selection" },
                      { key: "includeUniversityShortlisting", label: "University Shortlisting" },
                      { key: "includeExpertEditing", label: "SOP, LOR, Resume, Essays Reviews" },
                      { key: "includeOneOnOneEditing", label: "1:1 Document Editing" },
                      { key: "includeProfileBuilding", label: "Comprehensive Profile-building" },
                      { key: "includeTop50Counselling", label: "Top 50 University-specific Counselling" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id={`edit-${item.key}`} 
                          name={item.key} 
                          defaultChecked={editingPlan[item.key as keyof SubscriptionPlan] as boolean || false}
                          className="rounded" 
                        />
                        <Label htmlFor={`edit-${item.key}`} className="font-normal cursor-pointer">{item.label}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-base">Category 2: Student Support & Mentorship</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Support Channels (Select all that apply)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "email", label: "Email Support" },
                        { value: "whatsapp", label: "WhatsApp Support" },
                        { value: "phone", label: "Phone Support" },
                        { value: "premium", label: "Premium Support" },
                      ].map((support) => (
                        <div key={support.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-support-${support.value}`}
                            checked={editSupportTypes.includes(support.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditSupportTypes([...editSupportTypes, support.value]);
                              } else {
                                setEditSupportTypes(editSupportTypes.filter(t => t !== support.value));
                              }
                            }}
                          />
                          <Label htmlFor={`edit-support-${support.value}`} className="font-normal cursor-pointer">
                            {support.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <input type="hidden" name="supportType" value={editSupportTypes[0] || editingPlan.supportType} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="edit-includeDedicatedManager" 
                      name="includeDedicatedManager" 
                      defaultChecked={editingPlan.includeDedicatedManager}
                      className="rounded" 
                    />
                    <Label htmlFor="edit-includeDedicatedManager" className="font-normal cursor-pointer">Dedicated Manager</Label>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-base">Category 3: Phozos AI</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Label className="mb-3 block">AI Tier</Label>
                  <RadioGroup value={editPhozosAiTier} onValueChange={setEditPhozosAiTier} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="none" id="edit-ai-none" />
                      <Label htmlFor="edit-ai-none" className="font-normal cursor-pointer">None</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="basic" id="edit-ai-basic" />
                      <Label htmlFor="edit-ai-basic" className="font-normal cursor-pointer">Basic</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pro" id="edit-ai-pro" />
                      <Label htmlFor="edit-ai-pro" className="font-normal cursor-pointer">Pro</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ultra" id="edit-ai-ultra" />
                      <Label htmlFor="edit-ai-ultra" className="font-normal cursor-pointer">Ultra</Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card className="border-yellow-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-yellow-600" />
                    <CardTitle className="text-base">Category 4: Financial & Scholarship Services</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { key: "includeScholarshipPlanning", label: "Scholarship Assistance" },
                    { key: "includeLoanAssistance", label: "Phozos Finance (Loan Assistance)" },
                    { key: "includeForexServices", label: "Forex Services" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id={`edit-${item.key}`} 
                        name={item.key} 
                        defaultChecked={editingPlan[item.key as keyof SubscriptionPlan] as boolean || false}
                        className="rounded" 
                      />
                      <Label htmlFor={`edit-${item.key}`} className="font-normal cursor-pointer">{item.label}</Label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-orange-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Plane className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-base">Category 5: Visa & Post-Admission</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { key: "includeVisaSupport", label: "Visa Guidance" },
                    { key: "includePreDepartureSession", label: "Pre-departure Session" },
                    { key: "includeMockInterview", label: "Mock Interview Classes" },
                    { key: "includeFlightAccommodation", label: "Flight & Accommodation Services" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id={`edit-${item.key}`} 
                        name={item.key} 
                        defaultChecked={editingPlan[item.key as keyof SubscriptionPlan] as boolean || false}
                        className="rounded" 
                      />
                      <Label htmlFor={`edit-${item.key}`} className="font-normal cursor-pointer">{item.label}</Label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-indigo-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-indigo-600" />
                    <CardTitle className="text-base">Category 6: Phozos Prep</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-3 block">Prep Tier</Label>
                    <RadioGroup value={editPhozosPrepTier} onValueChange={setEditPhozosPrepTier} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="edit-prep-none" />
                        <Label htmlFor="edit-prep-none" className="font-normal cursor-pointer">None</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="basic" id="edit-prep-basic" />
                        <Label htmlFor="edit-prep-basic" className="font-normal cursor-pointer">Basic</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pro" id="edit-prep-pro" />
                        <Label htmlFor="edit-prep-pro" className="font-normal cursor-pointer">Pro</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ultra" id="edit-prep-ultra" />
                        <Label htmlFor="edit-prep-ultra" className="font-normal cursor-pointer">Ultra</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor="edit-phozosPrepDescription">Description</Label>
                    <Textarea 
                      id="edit-phozosPrepDescription" 
                      name="phozosPrepDescription" 
                      placeholder="Describe Phozos Prep benefits (optional)..." 
                      rows={3}
                      defaultValue={editingPlan.phozosPrepDescription || ""}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Additional Settings</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "includeCounselorSession", label: "Counselor Session (Legacy)" },
                    { key: "includePostAdmitSupport", label: "Post-Admit Support (Legacy)" },
                    { key: "includeNetworkingEvents", label: "Networking Events (Legacy)" },
                    { key: "isBusinessFocused", label: "Business Focused" },
                    { key: "isActive", label: "Active" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id={`edit-${item.key}`} 
                        name={item.key} 
                        defaultChecked={editingPlan[item.key as keyof SubscriptionPlan] as boolean}
                        className="rounded" 
                      />
                      <Label htmlFor={`edit-${item.key}`} className="font-normal cursor-pointer text-sm">{item.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
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

      <PriceUpdateDialog
        plan={editingPlan}
        open={priceUpdateDialogOpen}
        onOpenChange={setPriceUpdateDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
        }}
      />

      <PlanDeprecationDialog
        plan={editingPlan}
        availablePlans={plans.filter(p => p.id !== editingPlan?.id)}
        open={deprecationDialogOpen}
        onOpenChange={setDeprecationDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
        }}
      />

      <AlertDialog open={deletePlanDialog.open} onOpenChange={(open) => setDeletePlanDialog({ open, plan: null, subscriberCount: 0 })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Subscription Plan
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div>
                You are about to permanently delete the plan{" "}
                <strong className="text-foreground">{deletePlanDialog.plan?.name}</strong>.
              </div>

              {deletePlanDialog.subscriberCount > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warning: Active Subscribers</AlertTitle>
                  <AlertDescription>
                    This plan has <strong>{deletePlanDialog.subscriberCount}</strong> active subscriber
                    {deletePlanDialog.subscriberCount !== 1 ? "s" : ""}. Deleting this plan will affect{" "}
                    {deletePlanDialog.subscriberCount === 1 ? "this user" : "these users"}.
                  </AlertDescription>
                </Alert>
              )}

              {deletePlanDialog.subscriberCount === 0 && (
                <div className="text-sm text-muted-foreground">
                  This plan has no active subscribers.
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="delete-confirm" className="text-sm font-semibold">
                  Type <span className="text-destructive font-mono">DELETE</span> to confirm:
                </Label>
                <Input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="font-mono"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                This action cannot be undone. The plan and all associated data will be permanently deleted.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmationText("")}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirmDeletePlan}
              disabled={deleteConfirmationText !== "DELETE" || deletePlanMutation.isPending}
            >
              {deletePlanMutation.isPending ? "Deleting..." : "Delete Plan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
