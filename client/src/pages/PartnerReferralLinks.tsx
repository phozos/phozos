import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useReferralLinks, 
  useCreateReferralLink, 
  useUpdateReferralLink,
  useDeactivateReferralLink 
} from "@/hooks/partner-api-hooks";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Link2, 
  Plus, 
  Copy, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Eye,
  TrendingUp,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ReferralLinkWithStats } from "@shared/types/partner-types";
import { SEO } from "@/components/SEO";

const referralLinkSchema = z.object({
  campaignName: z.string().min(1, "Campaign name is required").max(100),
  campaignSource: z.string().optional(),
  campaignMedium: z.string().optional(),
  description: z.string().max(500).optional(),
  expiresAt: z.string().optional(),
});

type ReferralLinkForm = z.infer<typeof referralLinkSchema>;

export default function PartnerReferralLinks() {
  const { toast } = useToast();
  const { data: links = [], isLoading } = useReferralLinks();
  const createLinkMutation = useCreateReferralLink();
  const updateLinkMutation = useUpdateReferralLink();
  const deactivateLinkMutation = useDeactivateReferralLink();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ReferralLinkWithStats | null>(null);
  const [deletingLink, setDeletingLink] = useState<ReferralLinkWithStats | null>(null);

  const createForm = useForm<ReferralLinkForm>({
    resolver: zodResolver(referralLinkSchema),
    defaultValues: {
      campaignName: "",
      campaignSource: "",
      campaignMedium: "",
      description: "",
      expiresAt: "",
    },
  });

  const editForm = useForm<ReferralLinkForm>({
    resolver: zodResolver(referralLinkSchema),
  });

  useEffect(() => {
    if (editingLink) {
      editForm.reset({
        campaignName: editingLink.campaignName || "",
        campaignSource: editingLink.campaignSource || "",
        campaignMedium: editingLink.campaignMedium || "",
        description: editingLink.description || "",
        expiresAt: editingLink.expiresAt 
          ? new Date(editingLink.expiresAt).toISOString().split('T')[0] 
          : "",
      });
    }
  }, [editingLink, editForm]);

  const handleCreateLink = async (data: ReferralLinkForm) => {
    const payload = {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    };
    createLinkMutation.mutate(payload, {
      onSuccess: () => {
        setCreateDialogOpen(false);
        createForm.reset();
      },
    });
  };

  const handleUpdateLink = async (data: ReferralLinkForm) => {
    if (!editingLink) return;

    const updates = {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    };
    updateLinkMutation.mutate(
      { linkId: editingLink.id, updates },
      {
        onSuccess: () => {
          setEditingLink(null);
          editForm.reset();
        },
      }
    );
  };

  const handleDeactivateLink = async () => {
    if (!deletingLink) return;

    deactivateLinkMutation.mutate(deletingLink.id, {
      onSuccess: () => {
        setDeletingLink(null);
      },
    });
  };

  const copyToClipboard = (linkCode: string) => {
    const fullUrl = `${window.location.origin}/ref/${linkCode}`;
    navigator.clipboard.writeText(fullUrl);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  const getStatusBadge = (link: ReferralLinkWithStats) => {
    if (!link.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge className="bg-green-500">Active</Badge>;
  };

  return (
    <>
      <SEO 
        title="Referral Links - Partner Dashboard"
        description="Manage your referral links and track performance"
      />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 pt-16">
        <AppShell />
        
        <main className="container mx-auto px-4 pt-24 pb-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <Link2 className="w-8 h-8 mr-3 text-purple-600" />
                Referral Links
              </h1>
              <p className="text-muted-foreground mt-2">
                Create and manage your referral links to track student sign-ups
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Link
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Referral Links</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : links.length === 0 ? (
                <div className="text-center py-12">
                  <Link2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No referral links yet</p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Link
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Link Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Clicks</TableHead>
                      <TableHead className="text-center">Conversions</TableHead>
                      <TableHead className="text-center">Rate</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{link.campaignName}</div>
                            {link.description && (
                              <div className="text-sm text-muted-foreground">{link.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-muted px-2 py-1 rounded">{link.linkCode}</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(link.linkCode)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(link)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Eye className="w-4 h-4 text-muted-foreground" />
                            {link.clickCount || 0}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            {link.conversionCount || 0}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <TrendingUp className="w-4 h-4 text-purple-600" />
                            {link.conversionRate?.toFixed(1) || 0}%
                          </div>
                        </TableCell>
                        <TableCell>{link.createdAt ? format(new Date(link.createdAt), 'MMM d, yyyy') : 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => copyToClipboard(link.linkCode)}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(`/ref/${link.linkCode}`, '_blank')}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open Link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditingLink(link)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeletingLink(link)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Referral Link</DialogTitle>
              <DialogDescription>
                Create a new referral link to track student registrations
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateLink)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="campaignName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Summer 2024 Campaign" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="campaignSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="facebook, instagram, email" {...field} />
                      </FormControl>
                      <FormDescription>Where you'll share this link</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes about this campaign" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>Link will expire after this date</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLinkMutation.isPending}>
                    {createLinkMutation.isPending ? "Creating..." : "Create Link"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingLink} onOpenChange={(open) => !open && setEditingLink(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Referral Link</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleUpdateLink)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="campaignName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingLink(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateLinkMutation.isPending}>
                    {updateLinkMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingLink} onOpenChange={(open) => !open && setDeletingLink(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Referral Link?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the link "{deletingLink?.campaignName}". 
                The link will no longer accept new clicks, but existing data will be preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeactivateLink}
                className="bg-red-600 hover:bg-red-700"
              >
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
