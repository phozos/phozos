import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { usePartnerProfile, useUpdatePartnerProfile } from "@/hooks/partner-api-hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  User,
  CreditCard,
  Shield,
  ArrowLeft,
  Save,
  X,
  Edit,
  Phone,
  Mail,
  Globe,
  MapPin,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Ban,
} from "lucide-react";
import { Link } from "wouter";
import { BUSINESS_TYPES } from "@shared/types/partner-types";
import AppShell from "@/components/AppShell";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";

// Zod schema for partner profile form
const partnerProfileSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(200),
  contactPerson: z.string().min(1, "Contact person name is required").max(100),
  phone: z.string().min(10, "Valid phone number required"),
  whatsappNumber: z.string().optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  businessType: z.enum([
    'education_consultant',
    'immigration_firm',
    'language_school',
    'travel_agency',
    'career_counselor',
    'individual_consultant',
    'other'
  ]),
  bio: z.string().max(1000).optional(),
});

const paymentConfigSchema = z.object({
  payoutMethod: z.enum(['bank_transfer', 'paypal']).optional(),
  bankDetails: z.object({
    accountHolderName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    bankName: z.string().optional(),
    branchName: z.string().optional(),
  }).optional(),
  paypalEmail: z.string().email("Must be valid email").optional().or(z.literal("")),
});

type PartnerProfileForm = z.infer<typeof partnerProfileSchema>;
type PaymentConfigForm = z.infer<typeof paymentConfigSchema>;

const businessTypeLabels: Record<string, string> = {
  education_consultant: 'Education Consultant',
  immigration_firm: 'Immigration Firm',
  language_school: 'Language School',
  travel_agency: 'Travel Agency',
  career_counselor: 'Career Counselor',
  individual_consultant: 'Individual Consultant',
  other: 'Other',
};

export default function PartnerProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: profile, isLoading: profileLoading } = usePartnerProfile();
  const updateProfileMutation = useUpdatePartnerProfile();

  const [editingBusiness, setEditingBusiness] = useState(false);
  const [editingPayment, setEditingPayment] = useState(false);

  const businessForm = useForm<PartnerProfileForm>({
    resolver: zodResolver(partnerProfileSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      phone: "",
      whatsappNumber: "",
      website: "",
      businessType: "education_consultant",
      bio: "",
    },
  });

  const paymentForm = useForm<PaymentConfigForm>({
    resolver: zodResolver(paymentConfigSchema),
    defaultValues: {
      payoutMethod: undefined,
      bankDetails: {
        accountHolderName: "",
        accountNumber: "",
        ifscCode: "",
        bankName: "",
        branchName: "",
      },
      paypalEmail: "",
    },
  });

  // Load profile data into forms
  useEffect(() => {
    if (profile) {
      businessForm.reset({
        companyName: profile.companyName || "",
        contactPerson: profile.contactPerson || "",
        phone: profile.phone || "",
        whatsappNumber: profile.whatsappNumber || "",
        website: profile.website || "",
        businessType: (profile.businessType as any) || "education_consultant",
        bio: profile.bio || "",
      });

      paymentForm.reset({
        payoutMethod: (profile.payoutMethod as 'bank_transfer' | 'paypal') || undefined,
        bankDetails: profile.bankDetails || {
          accountHolderName: "",
          accountNumber: "",
          ifscCode: "",
          bankName: "",
          branchName: "",
        },
        paypalEmail: profile.paypalEmail || "",
      });
    }
  }, [profile]);

  const handleBusinessSave = async (data: PartnerProfileForm) => {
    updateProfileMutation.mutate(data, {
      onSuccess: () => {
        setEditingBusiness(false);
      },
    });
  };

  const handlePaymentSave = async (data: PaymentConfigForm) => {
    updateProfileMutation.mutate(data, {
      onSuccess: () => {
        setEditingPayment(false);
      },
    });
  };

  if (!user) {
    return <LoadingSkeleton type="card" count={3} />;
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppShell />
        <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <LoadingSkeleton type="card" count={3} />
        </div>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (!profile) return null;

    if (!profile.isActive) {
      return (
        <Badge variant="destructive" className="gap-2">
          <Ban className="w-4 h-4" />
          Inactive
        </Badge>
      );
    }

    if (profile.isVerified) {
      return (
        <Badge className="bg-green-500 gap-2">
          <CheckCircle className="w-4 h-4" />
          Verified Partner
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="gap-2">
        <Clock className="w-4 h-4" />
        Pending Verification
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppShell />
      
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/partner">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                Partner Profile
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your partner account settings and payment information
              </p>
            </div>
            {getStatusBadge()}
          </div>
        </div>

        <Tabs defaultValue="business" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="business">
              <Building2 className="w-4 h-4 mr-2" />
              Business Info
            </TabsTrigger>
            <TabsTrigger value="payment">
              <CreditCard className="w-4 h-4 mr-2" />
              Payment
            </TabsTrigger>
            <TabsTrigger value="status">
              <Shield className="w-4 h-4 mr-2" />
              Account Status
            </TabsTrigger>
          </TabsList>

          {/* Business Information Tab */}
          <TabsContent value="business">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Business Information</CardTitle>
                    <CardDescription>
                      Update your company details and contact information
                    </CardDescription>
                  </div>
                  {!editingBusiness && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingBusiness(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Form {...businessForm}>
                  <form onSubmit={businessForm.handleSubmit(handleBusinessSave)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={businessForm.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name *</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={!editingBusiness} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={businessForm.control}
                        name="contactPerson"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Person *</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={!editingBusiness} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={businessForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input {...field} disabled={!editingBusiness} className="pl-10" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={businessForm.control}
                        name="whatsappNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WhatsApp Number</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input {...field} disabled={!editingBusiness} className="pl-10" />
                              </div>
                            </FormControl>
                            <FormDescription>Optional - for direct communication</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={businessForm.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input {...field} disabled={!editingBusiness} className="pl-10" placeholder="https://" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={businessForm.control}
                        name="businessType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Type *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={!editingBusiness}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {BUSINESS_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {businessTypeLabels[type]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={businessForm.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio / Description</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              disabled={!editingBusiness}
                              rows={4}
                              placeholder="Tell us about your business and experience..."
                            />
                          </FormControl>
                          <FormDescription>
                            Brief description of your business (max 1000 characters)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {editingBusiness && (
                      <div className="flex gap-3 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingBusiness(false);
                            businessForm.reset();
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updateProfileMutation.isPending}>
                          <Save className="w-4 h-4 mr-2" />
                          {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Configuration Tab */}
          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payment Configuration</CardTitle>
                    <CardDescription>
                      Configure your payout methods and banking information
                    </CardDescription>
                  </div>
                  {!editingPayment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingPayment(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Form {...paymentForm}>
                  <form onSubmit={paymentForm.handleSubmit(handlePaymentSave)} className="space-y-6">
                    <FormField
                      control={paymentForm.control}
                      name="payoutMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Payout Method</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!editingPayment}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payout method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              <SelectItem value="paypal">PayPal</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose how you want to receive payouts
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Bank Details Section */}
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      <h3 className="font-semibold flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Bank Account Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={paymentForm.control}
                          name="bankDetails.accountHolderName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Holder Name</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={!editingPayment} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={paymentForm.control}
                          name="bankDetails.accountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Number</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={!editingPayment} type="password" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={paymentForm.control}
                          name="bankDetails.ifscCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IFSC Code</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={!editingPayment} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={paymentForm.control}
                          name="bankDetails.bankName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bank Name</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={!editingPayment} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={paymentForm.control}
                          name="bankDetails.branchName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Branch Name</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={!editingPayment} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* PayPal Section */}
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        PayPal Details
                      </h3>
                      <FormField
                        control={paymentForm.control}
                        name="paypalEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PayPal Email</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={!editingPayment} type="email" />
                            </FormControl>
                            <FormDescription>
                              Email associated with your PayPal account
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {editingPayment && (
                      <div className="flex gap-3 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingPayment(false);
                            paymentForm.reset();
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updateProfileMutation.isPending}>
                          <Save className="w-4 h-4 mr-2" />
                          {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Status Tab */}
          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
                <CardDescription>
                  View your partner account status and commission details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Verification Status */}
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-medium mb-2 block">Verification Status</Label>
                  <div className="flex items-center gap-2">
                    {profile?.isVerified ? (
                      <Badge className="bg-green-500 gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-2">
                        <Clock className="w-4 h-4" />
                        Pending Verification
                      </Badge>
                    )}
                  </div>
                  {!profile?.isVerified && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Your account is pending verification. Our team will review your application and contact you soon.
                    </p>
                  )}
                </div>

                {/* Account Status */}
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-medium mb-2 block">Account Status</Label>
                  <div className="flex items-center gap-2">
                    {profile?.isActive ? (
                      <Badge className="bg-green-500 gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-2">
                        <Ban className="w-4 h-4" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Commission Rate */}
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Commission Rate
                  </Label>
                  <div className="text-3xl font-bold text-blue-600">
                    {profile?.commissionRate || 0}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your commission rate on successful student conversions
                  </p>
                </div>

                {/* Minimum Payout */}
                <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Minimum Payout Amount
                  </Label>
                  <div className="text-2xl font-bold text-amber-600">
                    {formatCurrency(profile?.minimumPayout || 0, 'INR')}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Minimum commission amount required to request a payout
                  </p>
                </div>

                {/* Email */}
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Account Email
                  </Label>
                  <div className="text-sm">{user?.email}</div>
                </div>

                {/* Partner ID */}
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-medium mb-2 block">Partner ID</Label>
                  <div className="text-sm font-mono bg-muted px-3 py-2 rounded">
                    {profile?.id}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
