import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, DollarSign, Users, Settings, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { PremiumBadgeSelector, PremiumBadgeDisplay, BadgeKey, premiumBadges } from "@/components/PremiumBadges";
import { useAuth } from "@/hooks/useAuth";

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
    expiresAt: string;
    paymentReference?: string;
    paymentGateway?: string;
    autoRenew: boolean;
    universitiesUsed: number;
    countriesUsed: number;
    createdAt: string;
    updatedAt: string;
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  plan: {
    id: string;
    name: string;
    price: string;
    currency: string;
  };
}

export default function SubscriptionPlans() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeKey>("platinum");
  const [editSelectedBadge, setEditSelectedBadge] = useState<BadgeKey>("platinum");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  
  // Check if user is authenticated and is admin
  const isAdmin = user?.userType === 'team_member' && user?.teamRole === 'admin';

  // Fetch subscription plans (only when authenticated as admin)
  const { data: plans = [], isLoading: plansLoading } = useApiQuery<SubscriptionPlan[]>(
    ["/api/admin/subscription-plans"],
    '/api/admin/subscription-plans',
    undefined,
    { enabled: !loading && isAdmin }
  );

  // Fetch user subscriptions (only when authenticated as admin)
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useApiQuery<UserSubscription[]>(
    ["/api/admin/user-subscriptions"],
    '/api/admin/user-subscriptions',
    undefined,
    { enabled: !loading && isAdmin }
  );

  // Create plan mutation
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

  // Update plan mutation
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

  // Delete plan mutation
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
      displayOrder: parseInt(formData.get("displayOrder") as string) || 0,
      isActive: formData.get("isActive") === "on",
    };
    updatePlanMutation.mutate({ id: plan.id, updates });
  };

  // Helper function to safely cast string to BadgeKey with fallback
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
          <TabsTrigger value="subscriptions">User Subscriptions</TabsTrigger>
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

                  <div className="flex space-x-2 pt-2">
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
                      variant="destructive"
                      onClick={() => deletePlanMutation.mutate(plan.id)}
                      disabled={deletePlanMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
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
                User Subscriptions ({subscriptions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">User</th>
                      <th className="text-left py-2">Plan</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Started</th>
                      <th className="text-left py-2">Expires</th>
                      <th className="text-left py-2">Usage</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => (
                      <tr key={sub.subscription.id} className="border-b">
                        <td className="py-3">
                          <div>
                            <div className="font-medium">
                              {sub.user.firstName} {sub.user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{sub.user.email}</div>
                          </div>
                        </td>
                        <td className="py-3">
                          <div>
                            <div className="font-medium">{sub.plan.name}</div>
                            <div className="text-sm text-gray-500">
                              ${sub.plan.price} {sub.plan.currency}
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge 
                            className={
                              sub.subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                              sub.subscription.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }
                          >
                            {sub.subscription.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-sm">
                          {sub.subscription.startedAt ? new Date(sub.subscription.startedAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 text-sm">
                          {sub.subscription.expiresAt ? new Date(sub.subscription.expiresAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 text-sm">
                          <div>Unis: {sub.subscription.universitiesUsed}</div>
                          <div>Countries: {sub.subscription.countriesUsed}</div>
                        </td>
                        <td className="py-3">
                          <Button size="sm" variant="outline">
                            <Settings className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Plan Dialog */}
      {editingPlan && (
        <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
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
                <Textarea id="edit-features" name="features" rows={6} defaultValue={editingPlan.features.join('\n')} />
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
                  { key: "includeLoanAssistance", label: "Loan Assistance", value: editingPlan.includeLoanAssistance },
                  { key: "includeVisaSupport", label: "Visa Support", value: editingPlan.includeVisaSupport },
                  { key: "includeCounselorSession", label: "Counselor Session", value: editingPlan.includeCounselorSession },
                  { key: "includeScholarshipPlanning", label: "Scholarship Planning", value: editingPlan.includeScholarshipPlanning },
                  { key: "includeMockInterview", label: "Mock Interview", value: editingPlan.includeMockInterview },
                  { key: "includeExpertEditing", label: "Expert Editing", value: editingPlan.includeExpertEditing },
                  { key: "includePostAdmitSupport", label: "Post-Admit Support", value: editingPlan.includePostAdmitSupport },
                  { key: "includeDedicatedManager", label: "Dedicated Manager", value: editingPlan.includeDedicatedManager },
                  { key: "includeNetworkingEvents", label: "Networking Events", value: editingPlan.includeNetworkingEvents },
                  { key: "includeFlightAccommodation", label: "Flight & Accommodation", value: editingPlan.includeFlightAccommodation },
                  { key: "isBusinessFocused", label: "Business Focused", value: editingPlan.isBusinessFocused },
                  { key: "isActive", label: "Active", value: editingPlan.isActive },
                ].map((item) => (
                  <div key={item.key} className="flex items-center space-x-2">
                    <input type="checkbox" id={`edit-${item.key}`} name={item.key} defaultChecked={item.value} />
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
    </div>
  );
}